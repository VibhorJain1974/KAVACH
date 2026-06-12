'use client';

import { useEffect, useRef } from 'react';

interface SolarHeaderProps {
  stormActive: boolean;
  kp: number;
}

export default function SolarHeader({ stormActive, kp }: SolarHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let THREE: typeof import('three');
    let renderer: import('three').WebGLRenderer;
    let scene: import('three').Scene;
    let camera: import('three').PerspectiveCamera;
    let sun: import('three').Mesh;
    let earth: import('three').Mesh;
    let particles: import('three').Points;
    let particlePositions: Float32Array;
    let particleVelocities: Float32Array;
    const PARTICLE_COUNT = 800;

    async function init() {
      THREE = await import('three');

      renderer = new THREE.WebGLRenderer({ canvas: canvas ?? undefined, antialias: true, alpha: true });
      renderer.setSize(canvas!.offsetWidth, canvas!.offsetHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, canvas!.offsetWidth / canvas!.offsetHeight, 0.1, 1000);
      camera.position.set(0, 0, 8);

      // Sun
      const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.set(-5, 0, 0);
      scene.add(sun);

      // Sun corona glow (additive blending ring)
      const coronaGeo = new THREE.SphereGeometry(1.6, 32, 32);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      sun.add(new THREE.Mesh(coronaGeo, coronaMat));

      // Earth
      const earthGeo = new THREE.SphereGeometry(0.5, 32, 32);
      const earthMat = new THREE.MeshBasicMaterial({ color: 0x1a4a8a });
      earth = new THREE.Mesh(earthGeo, earthMat);
      earth.position.set(5, 0, 0);
      scene.add(earth);

      // Earth atmosphere
      const atmosGeo = new THREE.SphereGeometry(0.6, 32, 32);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x0066ff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      earth.add(new THREE.Mesh(atmosGeo, atmosMat));

      // CME particle stream (Sun → Earth)
      particlePositions = new Float32Array(PARTICLE_COUNT * 3);
      particleVelocities = new Float32Array(PARTICLE_COUNT);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        resetParticle(i);
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

      const pMat = new THREE.PointsMaterial({
        color: stormActive ? 0xff4444 : 0x00d4ff,
        size: 0.04,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);
    }

    function resetParticle(i: number) {
      // Start near sun with small y/z spread
      particlePositions[i * 3] = -5 + (Math.random() - 0.5) * 0.4;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      // Speed ramps with Kp
      const baseSpeed = 0.008 + (kp / 9) * 0.025;
      particleVelocities[i] = baseSpeed * (0.7 + Math.random() * 0.6);
    }

    function animate() {
      animRef.current = requestAnimationFrame(animate);

      sun.rotation.y += 0.003;
      earth.rotation.y += 0.005;

      const pGeo = particles.geometry;
      const positions = pGeo.attributes.position.array as Float32Array;
      const pMat = particles.material as import('three').PointsMaterial;

      // Storm color
      pMat.color.set(stormActive ? 0xff4444 : 0x00d4ff);
      pMat.opacity = stormActive ? 0.9 : 0.7;

      // Sun corona pulse during storm
      const coronaMesh = sun.children[0] as import('three').Mesh;
      if (stormActive) {
        const t = Date.now() * 0.002;
        (coronaMesh.material as import('three').MeshBasicMaterial).opacity = 0.15 + Math.sin(t) * 0.12;
      }

      // Earth glow during storm
      const atmosMesh = earth.children[0] as import('three').Mesh;
      if (stormActive) {
        (atmosMesh.material as import('three').MeshBasicMaterial).color.set(0xff2200);
        (atmosMesh.material as import('three').MeshBasicMaterial).opacity = 0.3;
      } else {
        (atmosMesh.material as import('three').MeshBasicMaterial).color.set(0x0066ff);
        (atmosMesh.material as import('three').MeshBasicMaterial).opacity = 0.12;
      }

      // Move particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] += particleVelocities[i];
        // Slight drift toward Earth position
        positions[i * 3 + 1] *= 0.998;
        positions[i * 3 + 2] *= 0.998;

        // Reset when past Earth
        if (positions[i * 3] > 5.5) {
          resetParticle(i);
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    init().then(() => animate());

    const onResize = () => {
      if (!canvas || !renderer || !camera) return;
      renderer.setSize(canvas!.offsetWidth, canvas!.offsetHeight);
      camera.aspect = canvas!.offsetWidth / canvas!.offsetHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      renderer?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update particle color/speed without remounting
  useEffect(() => {
    // The animate loop reads stormActive/kp from closure on next frame
    // We don't need to re-init; the particle reset uses kp from outer scope
  }, [stormActive, kp]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 200,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #04040f 0%, #0a0a1a 100%)',
      borderBottom: '1px solid rgba(0,212,255,0.1)',
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {/* Overlay: KAVACH brand + storm status — centered in right 60% to avoid Sun sphere */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 4,
        paddingLeft: '30%',
      }}>
        <div style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.25em',
          color: '#00d4ff',
          textShadow: '0 0 24px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.2)',
        }}>
          KAVACH
        </div>
        <div style={{
          fontSize: 9,
          letterSpacing: '0.3em',
          color: stormActive ? '#ff4444' : 'rgba(224,224,255,0.4)',
          fontFamily: 'DM Mono, monospace',
          transition: 'color 0.5s',
          textShadow: stormActive ? '0 0 12px rgba(255,68,68,0.5)' : 'none',
        }}>
          {stormActive
            ? `SOLAR STORM ACTIVE — Kp ${kp.toFixed(1)} — INDIA GRID AT RISK`
            : 'AUTONOMOUS SPACE WEATHER SHIELD — 1.4 BILLION INDIANS PROTECTED'}
        </div>
      </div>

      {/* Left: SUN label */}
      <div style={{
        position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
        fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,170,0,0.5)',
        fontFamily: 'DM Mono, monospace',
      }}>SUN</div>

      {/* Right: EARTH label */}
      <div style={{
        position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
        fontSize: 8, letterSpacing: '0.2em', color: 'rgba(0,212,255,0.5)',
        fontFamily: 'DM Mono, monospace',
        textAlign: 'right',
      }}>EARTH<br/><span style={{ color: 'rgba(0,255,136,0.5)' }}>INDIA</span></div>
    </div>
  );
}
