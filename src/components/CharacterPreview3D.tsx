import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animateCharacterRig, buildBlockyCharacter } from '../game/characterMesh3d';
import { detectSoftwareWebGL } from '../game/renderer3d';
import { CharacterId, EquippedCostume, WeaponId } from '../game/types';

interface Props {
  mode: 'duo' | 'single';
  characterId?: CharacterId;
  nabilCostume: EquippedCostume;
  jihanCostume: EquippedCostume;
  weaponId: WeaponId;
  className?: string;
}

export const CharacterPreview3D: React.FC<Props> = ({
  mode,
  characterId = 'nabil',
  nabilCostume,
  jihanCostume,
  weaponId,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoft = detectSoftwareWebGL();
    const w = container.clientWidth || 360;
    const h = container.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoft,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoft ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 40);
    camera.position.set(0, 1.45, mode === 'duo' ? 4.3 : 3.2);
    camera.lookAt(0, 0.9, 0);

    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.8);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.3);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0x60a5fa, 0.5);
    rim.position.set(-3, 3, -3);
    scene.add(hemi, key, rim);

    // Pedestal disc
    const pedGeo = new THREE.CylinderGeometry(mode === 'duo' ? 1.55 : 0.95, mode === 'duo' ? 1.7 : 1.05, 0.2, 24);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.35 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.1;
    scene.add(ped);

    const rigs: ReturnType<typeof buildBlockyCharacter>[] = [];
    if (mode === 'duo') {
      const nabilRig = buildBlockyCharacter('nabil', nabilCostume, weaponId);
      nabilRig.group.position.set(-0.72, 0, 0);
      nabilRig.group.rotation.y = 0.22;
      const jihanRig = buildBlockyCharacter('jihan', jihanCostume, weaponId);
      jihanRig.group.position.set(0.72, 0, 0);
      jihanRig.group.rotation.y = -0.22;
      scene.add(nabilRig.group, jihanRig.group);
      rigs.push(nabilRig, jihanRig);
    } else {
      const costume = characterId === 'nabil' ? nabilCostume : jihanCostume;
      const rig = buildBlockyCharacter(characterId, costume, weaponId);
      scene.add(rig.group);
      rigs.push(rig);
    }

    let rafId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          rafId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          rafId = window.setTimeout(cb, 80);
        }
      };
      rafId = window.setTimeout(poll, 8);
    };

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      rigs.forEach((rig, idx) => {
        animateCharacterRig(rig, 'idle', elapsed + idx * 1.2);
        if (mode === 'single') {
          rig.group.rotation.y = Math.sin(elapsed * 0.7) * 0.55;
        } else {
          rig.group.position.y = Math.sin(elapsed * 2.2 + idx * Math.PI) * 0.04;
        }
      });
      renderer.render(scene, camera);
      if (isSoft) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container || disposed) return;
      const nw = container.clientWidth || 360;
      const nh = container.clientHeight || 300;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
      window.removeEventListener('resize', onResize);
      pedGeo.dispose();
      pedMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode, characterId, nabilCostume, jihanCostume, weaponId]);

  return <div ref={mountRef} className={`w-full h-full ${className}`} />;
};
