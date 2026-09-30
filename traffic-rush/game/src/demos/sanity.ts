import * as THREE from 'three';
const canvas = document.getElementById('c') as HTMLCanvasElement;
const r = new THREE.WebGLRenderer({ canvas, antialias: true });
r.setSize(innerWidth, innerHeight, false);
const s = new THREE.Scene(); s.background = new THREE.Color(0x88bbee);
const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100); cam.position.set(3, 3, 3); cam.lookAt(0, 0, 0);
s.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xff5500 })), new THREE.HemisphereLight(0xffffff, 0x444444, 2));
r.render(s, cam);
console.log('[demo] rendered', r.info.render.calls);
