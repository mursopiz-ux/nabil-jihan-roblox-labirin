import * as THREE from 'three';
import { CHARACTERS, MONSTER_TEMPLATES, WEAPONS, getCostumeById } from './catalog';
import { CharacterId, EquippedCostume, MonsterKind, WeaponId } from './types';

export interface BlockyCharacterRig {
  group: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  headGroup: THREE.Object3D;
  weaponGroup: THREE.Object3D;
}

export function buildBlockyCharacter(
  characterId: CharacterId,
  costume: EquippedCostume,
  weaponId: WeaponId
): BlockyCharacterRig {
  const charDef = CHARACTERS[characterId];
  const shirt = getCostumeById(costume.baju);
  const pants = getCostumeById(costume.celana);
  const hat = getCostumeById(costume.topi);
  const hair = getCostumeById(costume.rambut);
  const shoes = getCostumeById(costume.sepatu);
  const acc = getCostumeById(costume.aksesoris);
  const weapon = WEAPONS[weaponId];

  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: charDef.skinColor, roughness: 0.72, metalness: 0.05 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt.color, roughness: 0.65, metalness: 0.1 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants.color, roughness: 0.75, metalness: 0.05 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: shoes.color, roughness: 0.5, metalness: 0.12 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair.color, roughness: 0.6, metalness: 0.1 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.1 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.32), shirtMat);
  torso.position.y = 0.78;
  torso.castShadow = true;
  group.add(torso);

  // Shirt signature details (Nabil Koko Placket or Jihan Stripes)
  if (shirt.style === 'koko') {
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.48, 0.34),
      new THREE.MeshStandardMaterial({ color: shirt.accentColor || '#f5e6d3', roughness: 0.5 })
    );
    placket.position.set(0, 0.82, 0.01);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.34), shirtMat);
    hem.position.y = 0.5;
    group.add(placket, hem);
  } else if (shirt.style === 'striped') {
    const stripeMat = new THREE.MeshStandardMaterial({ color: shirt.accentColor || '#1e293b', roughness: 0.6 });
    for (let s = 0; s < 3; s++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.34), stripeMat);
      band.position.y = 0.65 + s * 0.14;
      group.add(band);
    }
    const bow = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: '#f43f8e', roughness: 0.4 })
    );
    bow.position.set(0.14, 0.9, 0.18);
    group.add(bow);
  } else if (shirt.accentColor) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.12, 0.34),
      new THREE.MeshStandardMaterial({ color: shirt.accentColor, roughness: 0.4, metalness: 0.25 })
    );
    stripe.position.y = 0.84;
    group.add(stripe);
  }

  // Pink flared skirt if equipped
  if (pants.style === 'skirt') {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.24, 0.44), pantsMat);
    skirt.position.y = 0.44;
    skirt.castShadow = true;
    const beltBow = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.09, 0.06),
      new THREE.MeshStandardMaterial({ color: pants.accentColor || '#fbcfe8', roughness: 0.4 })
    );
    beltBow.position.set(0, 0.52, 0.23);
    group.add(skirt, beltBow);
  }

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.32;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), eyeMat);
  eyeL.position.set(-0.11, 0.04, 0.23);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  headGroup.add(eyeL, eyeR);

  // Hair
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.5), hairMat);
  hairTop.position.y = 0.21;
  hairTop.castShadow = true;
  headGroup.add(hairTop);

  if (hair.style === 'ponytail') {
    const pony = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.2), hairMat);
    pony.position.set(0, 0.16, -0.28);
    pony.rotation.x = 0.25;
    headGroup.add(pony);
  } else if (hair.style === 'bob' || hair.style === 'long') {
    const hairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, hair.style === 'long' ? 0.5 : 0.32, 0.16),
      hairMat
    );
    hairBack.position.set(0, 0.02, -0.2);
    headGroup.add(hairBack);
  } else {
    const hairSpike = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), hairMat);
    hairSpike.position.set(0, 0.3, 0.04);
    headGroup.add(hairSpike);
  }

  // Hat
  if (hat.style !== 'none') {
    const hatMat = new THREE.MeshStandardMaterial({ color: hat.color, roughness: 0.45, metalness: 0.2 });
    if (hat.style === 'explorer') {
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.76), hatMat);
      brim.position.y = 0.28;
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.46), hatMat);
      crown.position.y = 0.41;
      headGroup.add(brim, crown);
    } else if (hat.style === 'crown' || hat.style === 'dragon') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.54), hatMat);
      band.position.y = 0.3;
      const hornMat = new THREE.MeshStandardMaterial({ color: hat.accentColor || '#ffffff', roughness: 0.25, metalness: 0.5 });
      const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), hornMat);
      hornL.position.set(-0.18, 0.42, 0.1);
      const hornR = hornL.clone();
      hornR.position.x = 0.18;
      headGroup.add(band, hornL, hornR);
    } else {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.54), hatMat);
      cap.position.y = 0.29;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.22), hatMat);
      visor.position.set(0, 0.23, 0.28);
      headGroup.add(cap, visor);
    }
  }

  // Ribbon or Glasses on Head
  if (acc.style === 'ribbon') {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: acc.color, roughness: 0.4 })
    );
    rib.position.set(0, 0.29, -0.2);
    headGroup.add(rib);
  } else if (acc.style === 'glasses') {
    const frameMat = new THREE.MeshStandardMaterial({ color: acc.color, roughness: 0.3, metalness: 0.4 });
    const lensMat = new THREE.MeshStandardMaterial({ color: acc.accentColor || '#38bdf8', roughness: 0.15, metalness: 0.5 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.06), frameMat);
    frame.position.set(0, 0.04, 0.24);
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.03), lensMat);
    lensL.position.set(-0.11, 0.04, 0.26);
    const lensR = lensL.clone();
    lensR.position.x = 0.11;
    headGroup.add(frame, lensL, lensR);
  }

  group.add(headGroup);

  // Backpack / Cape / Wings on torso back
  if (acc.style === 'backpack') {
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.42, 0.2),
      new THREE.MeshStandardMaterial({ color: acc.color, roughness: 0.65 })
    );
    pack.position.set(0, 0.78, -0.24);
    pack.castShadow = true;
    group.add(pack);
  } else if (acc.style === 'cape') {
    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.68, 0.06),
      new THREE.MeshStandardMaterial({ color: acc.color, roughness: 0.7 })
    );
    cape.position.set(0, 0.72, -0.21);
    cape.rotation.x = 0.12;
    group.add(cape);
  } else if (acc.style === 'wings') {
    const wingMat = new THREE.MeshStandardMaterial({ color: acc.color, roughness: 0.35, metalness: 0.3 });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.06), wingMat);
    wingL.position.set(-0.34, 0.86, -0.22);
    wingL.rotation.y = -0.35;
    const wingR = wingL.clone();
    wingR.position.x = 0.34;
    wingR.rotation.y = 0.35;
    group.add(wingL, wingR);
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.38, 1.0, 0);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.2), shirtMat);
  lArmMesh.position.y = -0.22;
  lArmMesh.castShadow = true;
  const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.18), skinMat);
  lHand.position.y = -0.48;
  leftArm.add(lArmMesh, lHand);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.38, 1.0, 0);
  const rArmMesh = lArmMesh.clone();
  const rHand = lHand.clone();
  rightArm.add(rArmMesh, rHand);

  // Weapon attached to Right Arm
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.48, 0.14);
  const wMat = new THREE.MeshStandardMaterial({ color: weapon.color, roughness: 0.3, metalness: 0.45 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  if (weaponId === 'cartoon_hammer') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), handleMat);
    shaft.position.z = 0.22;
    const headHam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.24), wMat);
    headHam.position.z = 0.48;
    weaponGroup.add(shaft, headHam);
  } else if (weaponId === 'bubble_blaster') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.42), wMat);
    body.position.z = 0.18;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 0.42;
    weaponGroup.add(body, nozzle);
  } else if (weaponId === 'magic_wand') {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), handleMat);
    stick.position.z = 0.22;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), wMat);
    star.position.z = 0.54;
    weaponGroup.add(stick, star);
  } else {
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), handleMat);
    hilt.position.z = 0.1;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.56), wMat);
    blade.position.z = 0.4;
    weaponGroup.add(hilt, blade);
  }
  rightArm.add(weaponGroup);
  group.add(leftArm, rightArm);

  // Legs + Shoes
  const legMat = pants.style === 'skirt' ? skinMat : pantsMat;
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.15, 0.5, 0);
  const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.36, 0.22), legMat);
  lLegMesh.position.y = -0.18;
  lLegMesh.castShadow = true;
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.3), shoeMat);
  lShoe.position.set(0, -0.43, 0.03);
  leftLeg.add(lLegMesh, lShoe);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.15, 0.5, 0);
  const rLegMesh = lLegMesh.clone();
  const rShoe = lShoe.clone();
  rightLeg.add(rLegMesh, rShoe);

  group.add(leftLeg, rightLeg);

  return { group, leftArm, rightArm, leftLeg, rightLeg, headGroup, weaponGroup };
}

export function buildBlockyMonster(kind: MonsterKind, isBoss: boolean): THREE.Group {
  const tpl = MONSTER_TEMPLATES[kind];
  const group = new THREE.Group();
  const s = isBoss ? 2.1 : tpl.isElite ? 1.35 : 1.0;

  const mainMat = new THREE.MeshStandardMaterial({
    color: tpl.color,
    roughness: kind === 'slime' || kind === 'shadow_slime' || kind === 'ice' ? 0.25 : 0.65,
    metalness: kind === 'bone_knight' ? 0.35 : 0.1,
    transparent: kind === 'slime' || kind === 'phantom_ghost' || kind === 'ghost',
    opacity: kind === 'slime' ? 0.88 : kind === 'phantom_ghost' || kind === 'ghost' ? 0.82 : 1,
  });
  const accMat = new THREE.MeshStandardMaterial({
    color: tpl.accentColor,
    emissive: kind === 'lava_golem' || kind === 'shadow_slime' ? tpl.accentColor : 0x000000,
    emissiveIntensity: kind === 'lava_golem' ? 0.55 : 0.3,
    roughness: 0.35,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: tpl.eyeColor,
    emissive: tpl.eyeColor,
    emissiveIntensity: 0.85,
    roughness: 0.15,
  });

  if (kind === 'shadow_slime' || kind === 'slime') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.84 * s, 0.72 * s, 0.84 * s), mainMat);
    body.position.y = 0.38 * s;
    body.castShadow = true;
    const ooze = new THREE.Mesh(new THREE.BoxGeometry(0.98 * s, 0.14 * s, 0.98 * s), accMat);
    ooze.position.y = 0.07 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.16 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.2 * s, 0.48 * s, 0.43 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.2 * s;
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.36 * s, 0.14 * s, 0.06 * s), accMat);
    mouth.position.set(0, 0.24 * s, 0.43 * s);
    group.add(body, ooze, eyeL, eyeR, mouth);
  } else if (kind === 'bone_knight') {
    // Purple/Gold Armored Skeleton Knight + Giant Hammer!
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.4, metalness: 0.45 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.6 * s, 0.4 * s), armorMat);
    torso.position.y = 0.75 * s;
    torso.castShadow = true;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.46 * s, 0.46 * s), mainMat);
    skull.position.y = 1.32 * s;
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.64 * s, 0.22 * s, 0.54 * s), accMat);
    hat.position.y = 1.62 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.11 * s, 0.11 * s, 0.05 * s), eyeMat);
    eyeL.position.set(-0.12 * s, 1.34 * s, 0.24 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12 * s;
    const hammerShaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 * s, 0.75 * s, 0.08 * s),
      new THREE.MeshStandardMaterial({ color: 0x78350f })
    );
    hammerShaft.position.set(0.45 * s, 0.85 * s, 0.2 * s);
    hammerShaft.rotation.x = 0.4;
    const hammerHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.35 * s, 0.28 * s, 0.35 * s),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.25 })
    );
    hammerHead.position.set(0.45 * s, 1.18 * s, 0.36 * s);
    group.add(torso, skull, hat, eyeL, eyeR, hammerShaft, hammerHead);
  } else if (kind === 'phantom_ghost' || kind === 'ghost') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.85 * s, 0.76 * s), mainMat);
    body.position.y = 0.68 * s;
    body.castShadow = true;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.54 * s, 0.22 * s, 0.54 * s), accMat);
    hood.position.y = 1.16 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.18 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.18 * s, 0.78 * s, 0.39 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18 * s;
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.22 * s, 0.28 * s), mainMat);
    handL.position.set(-0.5 * s, 0.68 * s, 0.22 * s);
    const handR = handL.clone();
    handR.position.x = 0.5 * s;
    group.add(body, hood, eyeL, eyeR, handL, handR);
  } else if (kind === 'lava_golem') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95 * s, 0.9 * s, 0.85 * s), mainMat);
    body.position.y = 0.55 * s;
    body.castShadow = true;
    const magmaCrack = new THREE.Mesh(new THREE.BoxGeometry(0.98 * s, 0.16 * s, 0.88 * s), accMat);
    magmaCrack.position.y = 0.36 * s;
    const hornRock = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.26 * s, 0.42 * s), mainMat);
    hornRock.position.y = 1.08 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.16 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.2 * s, 0.68 * s, 0.44 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.2 * s;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.6 * s, 0.28 * s), mainMat);
    armL.position.set(-0.62 * s, 0.55 * s, 0.1 * s);
    const armR = armL.clone();
    armR.position.x = 0.62 * s;
    group.add(body, magmaCrack, hornRock, eyeL, eyeR, armL, armR);
  } else if (kind === 'forest_king') {
    // BOSS LEVEL 5: Forest King (Root & Bark Giant with Moss Crown)
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.95 * s, 1.05 * s, 0.85 * s), mainMat);
    trunk.position.y = 0.55 * s;
    trunk.castShadow = true;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.15 * s, 0.35 * s, 1.05 * s), accMat);
    canopy.position.y = 1.18 * s;
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(0.55 * s, 0.24 * s, 0.55 * s),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.65, roughness: 0.25 })
    );
    crown.position.y = 1.44 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.16 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.22 * s, 0.72 * s, 0.44 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.22 * s;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.75 * s, 0.32 * s), mainMat);
    armL.position.set(-0.68 * s, 0.55 * s, 0.1 * s);
    const armR = armL.clone();
    armR.position.x = 0.68 * s;
    group.add(trunk, canopy, crown, eyeL, eyeR, armL, armR);
  } else if (kind === 'lava_dragon' || kind === 'dragon') {
    // BOSS LEVEL 10: Lava Dragon (Giant Red Dragon with Wings & Magma Belly)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.85 * s, 0.95 * s), mainMat);
    body.position.y = 0.6 * s;
    body.castShadow = true;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.6 * s, 0.98 * s), accMat);
    belly.position.y = 0.55 * s;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.54 * s, 0.36 * s, 0.48 * s), mainMat);
    snout.position.set(0, 0.85 * s, 0.6 * s);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.85 * s, 0.48 * s, 0.08 * s), accMat);
    wingL.position.set(-0.82 * s, 0.82 * s, -0.1 * s);
    wingL.rotation.z = 0.25;
    const wingR = wingL.clone();
    wingR.position.x = 0.82 * s;
    wingR.rotation.z = -0.25;
    const hornL = new THREE.Mesh(
      new THREE.BoxGeometry(0.14 * s, 0.32 * s, 0.14 * s),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    hornL.position.set(-0.26 * s, 1.2 * s, 0.25 * s);
    const hornR = hornL.clone();
    hornR.position.x = 0.26 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.15 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.2 * s, 0.92 * s, 0.5 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.2 * s;
    group.add(body, belly, snout, wingL, wingR, hornL, hornR, eyeL, eyeR);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.72 * s, 0.76 * s), mainMat);
    body.position.y = 0.42 * s;
    body.castShadow = true;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.26 * s, 0.42 * s), accMat);
    crest.position.y = 0.9 * s;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.13 * s, 0.14 * s, 0.06 * s), eyeMat);
    eyeL.position.set(-0.18 * s, 0.52 * s, 0.39 * s);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18 * s;
    group.add(body, crest, eyeL, eyeR);
  }

  return group;
}

export function animateCharacterRig(
  rig: BlockyCharacterRig,
  animState: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hit',
  t: number
): void {
  if (animState === 'walk' || animState === 'run') {
    const freq = animState === 'run' ? 14 : 9;
    const amp = animState === 'run' ? 0.75 : 0.45;
    rig.leftLeg.rotation.x = Math.sin(t * freq) * amp;
    rig.rightLeg.rotation.x = -Math.sin(t * freq) * amp;
    rig.leftArm.rotation.x = -Math.sin(t * freq) * amp;
    rig.rightArm.rotation.x = Math.sin(t * freq) * amp;
  } else if (animState === 'jump') {
    rig.leftArm.rotation.x = -0.9;
    rig.rightArm.rotation.x = -0.9;
    rig.leftLeg.rotation.x = 0.35;
    rig.rightLeg.rotation.x = -0.35;
  } else if (animState === 'attack') {
    rig.rightArm.rotation.x = -1.65 + Math.sin(t * 28) * 0.4;
    rig.leftArm.rotation.x = 0.3;
  } else if (animState === 'hit') {
    rig.leftArm.rotation.x = -0.5;
    rig.rightArm.rotation.x = -0.5;
  } else {
    rig.leftLeg.rotation.x = 0;
    rig.rightLeg.rotation.x = 0;
    rig.leftArm.rotation.x = Math.sin(t * 2.5) * 0.08;
    rig.rightArm.rotation.x = -Math.sin(t * 2.5) * 0.08;
  }
}
