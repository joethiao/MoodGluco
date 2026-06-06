/**
 * Avatar3D — true WebGL 3D avatar via expo-gl + three.js
 * Animations: idle breathing, head bob, speaking jaw + arm gesture, eye blink
 */
import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';

export default function Avatar3D({
  speaking  = false,
  skinColor = '#F5C28A',
  shirtColor = '#1B9AAA',
  style,
}) {
  const speakingRef  = useRef(speaking);
  const materialsRef = useRef({});
  const cleanupRef   = useRef(null);

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    if (materialsRef.current.skin) materialsRef.current.skin.color.set(skinColor);
  }, [skinColor]);

  useEffect(() => {
    const m = materialsRef.current;
    if (m.shirt) m.shirt.color.set(shirtColor);
    if (m.iris)  m.iris.color.set(new THREE.Color(shirtColor).lerp(new THREE.Color(0x002255), 0.5));
    if (m.aura)  m.aura.color.set(shirtColor);
  }, [shirtColor]);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const onContextCreate = useCallback(async (gl) => {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      context: gl,
      canvas: {
        width: W, height: H, style: {},
        addEventListener: () => {}, removeEventListener: () => {},
        clientWidth: W, clientHeight: H,
      },
      antialias: true,
    });
    renderer.setDrawingBufferSize(W, H, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F7FB);
    scene.fog = new THREE.FogExp2(0xF4F7FB, 0.065);

    // ── Camera ────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 1.1, 3.9);
    camera.lookAt(0, 0.95, 0);

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    const sun = new THREE.DirectionalLight(0xFFF8E0, 1.35);
    sun.position.set(2.5, 5, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 20;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xC0D0FF, 0.45);
    fill.position.set(-2.5, 1, -2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x88AAFF, 0.28);
    rim.position.set(0, 1, -4);
    scene.add(rim);

    scene.add(new THREE.HemisphereLight(0xCCDDFF, 0x443322, 0.35));

    // ── Materials ─────────────────────────────────────────────────────────
    const matSkin  = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor),  roughness: 0.6 });
    const matShirt = new THREE.MeshStandardMaterial({ color: new THREE.Color(shirtColor), roughness: 0.48, metalness: 0.06 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x1B2A3C, roughness: 0.75 });
    const matShoes = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.35 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const matIris  = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shirtColor).lerp(new THREE.Color(0x002255), 0.5),
      roughness: 0.2, metalness: 0.12,
    });
    const matHair  = new THREE.MeshStandardMaterial({ color: 0x100500, roughness: 1.0 });
    const matLip   = new THREE.MeshStandardMaterial({ color: 0xBB6868, roughness: 0.55 });
    const matBlush = new THREE.MeshStandardMaterial({ color: 0xFFB0A0, transparent: true, opacity: 0.3, roughness: 1 });
    const matAura  = new THREE.MeshBasicMaterial({
      color: new THREE.Color(shirtColor), transparent: true, opacity: 0, depthWrite: false,
    });

    materialsRef.current = { skin: matSkin, shirt: matShirt, iris: matIris, aura: matAura };

    // ── Shorthand mesh builder ────────────────────────────────────────────
    const mk = (geo, mat, x = 0, y = 0, z = 0, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (shadow) { m.castShadow = true; m.receiveShadow = true; }
      return m;
    };

    // ── Character root group ──────────────────────────────────────────────
    const char = new THREE.Group();
    scene.add(char);

    // ── SHOES ─────────────────────────────────────────────────────────────
    char.add(mk(new THREE.BoxGeometry(0.19, 0.1, 0.29), matShoes, -0.145, 0.05,  0.04));
    char.add(mk(new THREE.BoxGeometry(0.19, 0.1, 0.29), matShoes,  0.145, 0.05,  0.04));

    // ── PANTS (legs) ──────────────────────────────────────────────────────
    const legGeo = new THREE.CylinderGeometry(0.12, 0.105, 0.76, 14);
    char.add(mk(legGeo, matPants, -0.145, 0.53, 0));
    char.add(mk(legGeo, matPants,  0.145, 0.53, 0));
    char.add(mk(new THREE.SphereGeometry(0.21, 14, 10), matPants, 0, 0.88, 0)); // crotch fill

    // ── TORSO ─────────────────────────────────────────────────────────────
    const torsoMesh = mk(new THREE.CylinderGeometry(0.29, 0.235, 0.72, 20), matShirt, 0, 1.27, 0);
    char.add(torsoMesh);

    // collar ring
    const collar = mk(new THREE.TorusGeometry(0.155, 0.048, 8, 24), matShirt, 0, 1.62, 0, false);
    collar.rotation.x = Math.PI / 2;
    char.add(collar);

    // ── NECK ──────────────────────────────────────────────────────────────
    char.add(mk(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 14), matSkin, 0, 1.74, 0));

    // ── HEAD GROUP ────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.07, 0);
    char.add(headGroup);

    // face sphere
    headGroup.add(mk(new THREE.SphereGeometry(0.33, 32, 32), matSkin, 0, 0, 0));

    // hair dome
    const hairDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53),
      matHair,
    );
    hairDome.position.y = 0.06;
    hairDome.castShadow = true;
    headGroup.add(hairDome);

    // side hair
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.78),
        matHair,
      );
      m.position.set(s * 0.3, -0.03, 0);
      m.rotation.z = s * 0.78;
      headGroup.add(m);
    });

    // ── EYES ──────────────────────────────────────────────────────────────
    const eyeGroups = [];
    [[-0.135, 0.065, 0.283], [0.135, 0.065, 0.283]].forEach(([x, y, z]) => {
      const eg = new THREE.Group();
      eg.position.set(x, y, z);
      // white
      eg.add(new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 16), matWhite));
      // iris
      const ir = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), matIris);
      ir.position.z = 0.028;
      eg.add(ir);
      // pupil
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), matDark);
      pu.position.z = 0.052;
      eg.add(pu);
      // specular highlight
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), matWhite);
      hi.position.set(0.018, 0.018, 0.064);
      eg.add(hi);

      headGroup.add(eg);
      eyeGroups.push(eg);
    });

    // ── EYEBROWS ──────────────────────────────────────────────────────────
    [-1, 1].forEach((s) => {
      const m = mk(new THREE.BoxGeometry(0.11, 0.028, 0.035), matHair, s * 0.135, 0.192, 0.298, false);
      m.rotation.z = s * -0.19;
      headGroup.add(m);
    });

    // ── NOSE ──────────────────────────────────────────────────────────────
    headGroup.add(mk(new THREE.SphereGeometry(0.04, 10, 8),  matSkin,  0, -0.01, 0.332, false));
    headGroup.add(mk(new THREE.SphereGeometry(0.028, 8, 8),  matSkin, -0.044, -0.03, 0.326, false));
    headGroup.add(mk(new THREE.SphereGeometry(0.028, 8, 8),  matSkin,  0.044, -0.03, 0.326, false));

    // ── LIPS (upper, fixed) ───────────────────────────────────────────────
    headGroup.add(mk(new THREE.BoxGeometry(0.13, 0.028, 0.04), matLip, 0, -0.085, 0.322, false));

    // ── JAW GROUP (animated for speaking) ─────────────────────────────────
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.105, 0.04);
    headGroup.add(jawGroup);
    // jaw body
    jawGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.255, 24, 12, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.43),
      matSkin,
    ));
    // lower lip
    jawGroup.add(mk(new THREE.BoxGeometry(0.12, 0.026, 0.038), matLip, 0, -0.08, 0.306, false));

    // ── EARS ──────────────────────────────────────────────────────────────
    [-1, 1].forEach((s) => {
      headGroup.add(mk(new THREE.SphereGeometry(0.077, 10, 10), matSkin, s * 0.328, 0, 0, false));
    });

    // ── CHEEKS (blush) ────────────────────────────────────────────────────
    [-1, 1].forEach((s) => {
      headGroup.add(mk(new THREE.SphereGeometry(0.076, 8, 8), matBlush, s * 0.24, -0.035, 0.22, false));
    });

    // ── ARMS ──────────────────────────────────────────────────────────────
    const lArmG = new THREE.Group(); lArmG.position.set(-0.415, 1.46, 0);
    const rArmG = new THREE.Group(); rArmG.position.set( 0.415, 1.46, 0);

    const buildArm = (group) => {
      // shoulder cap
      group.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), matShirt));
      // upper arm (shirt)
      const ua = mk(new THREE.CylinderGeometry(0.088, 0.078, 0.42, 12), matShirt, 0, -0.22, 0);
      group.add(ua);
      // elbow pivot
      const elbow = new THREE.Group();
      elbow.position.y = -0.45;
      group.add(elbow);
      // lower arm (skin)
      elbow.add(mk(new THREE.CylinderGeometry(0.075, 0.068, 0.4, 12), matSkin, 0, -0.21, 0));
      // hand
      elbow.add(mk(new THREE.SphereGeometry(0.088, 14, 12), matSkin, 0, -0.43, 0));
      return elbow;
    };

    const lElbow = buildArm(lArmG);
    const rElbow = buildArm(rArmG);
    char.add(lArmG, rArmG);

    // ── FLOOR ─────────────────────────────────────────────────────────────
    const floorMesh = mk(
      new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshStandardMaterial({ color: 0xE8EEF8, roughness: 0.92 }),
      0, -0.002, 0, false,
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // drop shadow disc
    const dropShadow = mk(
      new THREE.CircleGeometry(0.56, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13, depthWrite: false }),
      0, 0.005, 0, false,
    );
    dropShadow.rotation.x = -Math.PI / 2;
    char.add(dropShadow);

    // ── SPEAKING AURA RING ────────────────────────────────────────────────
    const auraRing = mk(
      new THREE.TorusGeometry(0.52, 0.035, 8, 48),
      matAura, 0, 0.004, 0, false,
    );
    auraRing.rotation.x = -Math.PI / 2;
    char.add(auraRing);

    // ── INITIAL POSE ──────────────────────────────────────────────────────
    char.rotation.y = 0.12;
    lArmG.rotation.z =  0.22;
    rArmG.rotation.z = -0.22;

    // ── ANIMATION LOOP ────────────────────────────────────────────────────
    let rafId     = null;
    let t         = 0;
    let blinkWait = 2 + Math.random() * 3;
    let blinkT    = -1;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      const spk = speakingRef.current;

      // --- idle breathing: torso scales ---
      torsoMesh.scale.y      = 1 + Math.sin(t * 1.05) * 0.02;
      torsoMesh.position.y   = 1.27 + Math.sin(t * 1.05) * 0.007;

      // --- head bob + subtle nod/turn ---
      headGroup.position.y   = 2.07 + Math.sin(t * 0.85) * 0.014;
      headGroup.rotation.x   = Math.sin(t * 0.37) * 0.022;
      headGroup.rotation.y   = Math.sin(t * 0.27) * 0.055;

      // --- whole-body gentle sway ---
      char.rotation.y        = 0.12 + Math.sin(t * 0.41) * 0.032;

      // --- speaking: jaw open/close + aura pulse ---
      if (spk) {
        jawGroup.rotation.x    = Math.max(0, Math.sin(t * 7.5) * 0.28 + Math.sin(t * 12.3) * 0.1);
        matAura.opacity        = 0.28 + Math.sin(t * 3.8) * 0.14;
        auraRing.scale.setScalar(1 + Math.sin(t * 2.8) * 0.04);
      } else {
        jawGroup.rotation.x   *= 0.82;
        matAura.opacity        = Math.max(0, matAura.opacity * 0.9);
      }

      // --- arm idle pendulum ---
      lArmG.rotation.z  =  0.22 + Math.sin(t * 0.95) * 0.065;
      lArmG.rotation.x  =         Math.sin(t * 0.63) * 0.04;
      rArmG.rotation.z  = -0.22 - Math.sin(t * 0.95) * 0.065;
      rArmG.rotation.x  =         Math.sin(t * 0.63) * 0.04;

      // --- speaking gesture: right arm raises, forearm extends ---
      if (spk) {
        rArmG.rotation.z  = -0.52 + Math.sin(t * 2.1) * 0.16;
        rArmG.rotation.x  =  0.18 + Math.sin(t * 1.7) * 0.10;
        rElbow.rotation.z = -0.10 + Math.sin(t * 2.4) * 0.22;
      } else {
        rElbow.rotation.z *= 0.88;
      }

      // --- blink ---
      if (blinkT < 0) {
        blinkWait -= 0.016;
        if (blinkWait <= 0) {
          blinkT    = 0;
          blinkWait = 2.5 + Math.random() * 3.5;
        }
      } else {
        blinkT += 0.016;
        const bt = Math.min(blinkT / 0.14, 1);
        const sc = bt < 0.5 ? 1 - bt * 2 : (bt - 0.5) * 2;
        eyeGroups.forEach((eg) => { eg.scale.y = Math.max(0.06, sc); });
        if (bt >= 1) {
          blinkT = -1;
          eyeGroups.forEach((eg) => { eg.scale.y = 1; });
        }
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
    cleanupRef.current = () => { if (rafId) cancelAnimationFrame(rafId); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, style]}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
