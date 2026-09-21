/* Type shims for the landing page's lanyard (src/components/landing/lanyard).
   The two meshline elements are registered with R3F's extend() at runtime, so
   the JSX checker has to be told they exist. (The `*.glb` module declaration is
   in glb.d.ts: it must live in a file with no imports or exports to count as an
   ambient declaration rather than an augmentation.) */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Props are the raw MeshLine parameters; typing each one adds nothing
      // over the library's own docs.
      meshLineGeometry: any;
      meshLineMaterial: any;
    }
  }
}

export {};
