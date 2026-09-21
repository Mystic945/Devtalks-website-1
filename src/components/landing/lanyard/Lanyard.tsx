/* ============================================================
   DEVTALKS — LANYARD
   ------------------------------------------------------------
   A badge on a rope you can grab and swing: three.js for the
   drawing, Rapier for the rope-and-card physics. Ported from
   React Bits' <Lanyard /> to TypeScript.

   WHAT CHANGED FROM THE ORIGINAL
   • `paused` stops the render loop and the physics step together
     (frameloop 'never' + Physics paused). The landing page stays
     pinned behind the sheet that scrolls over it, so without this
     the simulation would keep running under the whole site.
   • The rope smoothing is clamped. The original's lerp factor is
     delta * 50, which passes 1 on any long frame; over 1 it overshoots
     more each frame until the band's points are infinite and it turns
     to NaN (seen here on a throttled browser).
   • The four scratch vectors are made once. The original built
     them again on every render.
   • The pixel ratio is capped at 1.5, and the context asks for the
     low-power GPU: a badge this size does not need the discrete one.
   • The smoothed rope-joint positions live in a ref array instead of
     being written onto the Rapier bodies as an ad-hoc `.lerped` field.

   The badge artwork comes in as frontImage / backImage; see
   badge.ts. card.glb is the original model from the React Bits repo;
   its baked-in artwork is painted over on both faces.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

import cardGLB from '@/assets/lanyard/card.glb';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

// 1x1 transparent pixel: lets useTexture be called unconditionally when a
// front/back image is not supplied.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// The model's front face is UV-mapped to the LEFT half of the texture atlas and
// the back face to the RIGHT half (measured from card.glb). Each custom image is
// composited into its own half so the two faces render independently.
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

type Vec3 = [number, number, number];

export interface LanyardProps {
  position?: Vec3;
  gravity?: Vec3;
  fov?: number;
  transparent?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
  /** True stops rendering and physics. */
  paused?: boolean;
  /** Called once the GL context exists (the model may still be loading). */
  onCreated?: () => void;
}

export default function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  frontImage = null,
  backImage = null,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  paused = false,
  onCreated
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position, fov }}
        dpr={[1, 1.5]}
        frameloop={paused ? 'never' : 'always'}
        gl={{ alpha: transparent, powerPreference: 'low-power' }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);
          // R3F aims the camera at the origin. Aim it straight ahead instead,
          // so a camera x/y offset slides the view rather than tilting it.
          camera.lookAt(position[0], position[1], 0);
          onCreated?.();
        }}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} paused={paused} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          <Band
            isMobile={isMobile}
            frontImage={frontImage}
            backImage={backImage}
            imageFit={imageFit}
            lanyardImage={lanyardImage}
            lanyardWidth={lanyardWidth}
          />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

interface BandProps {
  maxSpeed?: number;
  minSpeed?: number;
  isMobile: boolean;
  frontImage: string | null;
  backImage: string | null;
  imageFit: 'cover' | 'contain';
  lanyardImage: string | null;
  lanyardWidth: number;
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile,
  frontImage,
  backImage,
  imageFit,
  lanyardImage,
  lanyardWidth
}: BandProps) {
  const band = useRef<THREE.Mesh>(null);
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<RapierRigidBody>(null);
  const j2 = useRef<RapierRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);
  const card = useRef<RapierRigidBody>(null);

  // Scratch space for useFrame, made once. Smoothed positions for the two
  // middle rope joints live here too.
  const [tmp] = useState(() => ({
    vec: new THREE.Vector3(),
    ang: new THREE.Vector3(),
    rot: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    lerped: [null, null] as (THREE.Vector3 | null)[]
  }));

  const segmentProps = {
    type: 'dynamic' as const,
    canSleep: true,
    colliders: false as const,
    angularDamping: 4,
    linearDamping: 4
  };

  // The GLTF helper types nodes/materials as a loose record; the model's
  // structure is fixed (card, clip, clamp / base, metal).
  const { nodes, materials } = useGLTF(cardGLB) as any;
  // The original ships a default band (its own logo on black); this site
  // always supplies one, so the fallback is a plain white band instead.
  const texture = useTexture(lanyardImage || BLANK_PIXEL);
  // useTexture has to be called unconditionally.
  const frontTex = useTexture(frontImage || BLANK_PIXEL);
  const backTex = useTexture(backImage || BLANK_PIXEL);

  // Composite the front/back artwork into the card's texture atlas.
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map as THREE.Texture;
    if (!frontImage && !backImage) return baseMap;

    const baseImg = baseMap.image as HTMLImageElement;
    const W = baseImg.width;
    const H = baseImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    // Keep the baked atlas for the card edges and any face left untouched.
    ctx.drawImage(baseImg, 0, 0, W, H);

    const drawFitted = (img: HTMLImageElement, rect: { x: number; y: number; w: number; h: number }) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, rx + (rw - dw) / 2, ry + (rh - dh) / 2, dw, dh);
      ctx.restore();
    };

    if (frontImage && frontTex.image) drawFitted(frontTex.image as HTMLImageElement, FRONT_UV_RECT);
    if (backImage && backTex.image) drawFitted(backTex.image as HTMLImageElement, BACK_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);

  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0]
  ]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? 'grabbing' : 'grab';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    const { vec, ang, rot, dir, lerped } = tmp;

    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z
      });
    }

    if (fixed.current && j1.current && j2.current && j3.current && card.current && band.current) {
      // The smoothing factor has to stay in 0..1. With a long frame (a slow
      // machine, a tab coming back to the front) delta * 50 is well over 1,
      // and a lerp with a factor over 1 overshoots by more each frame until
      // the rope's points are infinite and the band turns to NaN.
      const dt = Math.min(delta, 1 / 30);
      [j1, j2].forEach((ref, i) => {
        const body = ref.current;
        if (!body) return;
        const current = lerped[i] ?? (lerped[i] = new THREE.Vector3().copy(body.translation()));
        const clampedDistance = Math.max(0.1, Math.min(1, current.distanceTo(body.translation())));
        const alpha = Math.min(1, dt * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
        current.lerp(body.translation(), alpha);
      });

      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(lerped[1] ?? j2.current.translation());
      curve.points[2].copy(lerped[0] ?? j1.current.translation());
      curve.points[3].copy(fixed.current.translation());
      (band.current.geometry as any).setPoints(curve.getPoints(isMobile ? 16 : 32));

      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation() as unknown as THREE.Vector3);
      // wakeUp = false, as in the original: a badge that has come to rest
      // should be allowed to sleep instead of being nudged awake every frame.
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false);
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  const release = (e: ThreeEvent<PointerEvent>) => {
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    drag(false);
  };
  const grab = (e: ThreeEvent<PointerEvent>) => {
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (card.current) drag(new THREE.Vector3().copy(e.point).sub(tmp.vec.copy(card.current.translation())));
  };

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={release}
            onPointerDown={grab}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}
