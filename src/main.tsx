/* ============================================================
   DEVTALKS 2026 — ENTRY
   ------------------------------------------------------------
   Mounts the app and pulls in the stylesheets. The import order
   in styles/index.css is load-bearing; see the note at the top of
   that file before changing it.

   NO <StrictMode>
   StrictMode double-invokes every effect in development: mount,
   clean up, mount again. Most of this site's effects are
   animations that own an element's inline transform, a running
   requestAnimationFrame loop, or a one-shot intro — running each
   of them twice makes development a poor guide to what visitors
   actually see, and the door intro in particular would play, be
   killed mid-tween, and play again. The effects are all written
   with real cleanup, which is the property StrictMode exists to
   check; they are simply checked by reading them rather than by
   running them twice.
   ============================================================ */

import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(<App />);
