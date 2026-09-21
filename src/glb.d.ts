/* `.glb` is not one of the asset types vite/client declares. */
declare module '*.glb' {
  const src: string;
  export default src;
}
