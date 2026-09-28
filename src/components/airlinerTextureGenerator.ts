import * as THREE from 'three';

/**
 * Procedural texture generator that recreates the authentic textures
 * from the 11803 Commercial Airplane model:
 * - 11803_Airplane_body_diff.jpg (White fuselage with red aerodynamic swoop & "Airplane" script)
 * - 11803_Airplane_tail_diff.jpg (Vibrant scarlet red vertical stabilizer with white swoops)
 * - 11803_Airplane_wing_big_L_diff.jpg & R_diff.jpg (Aero grey wings with "D-3262" and red tips)
 * - 11803_Airplane_wing_details_L_diff.jpg (Engine nacelles, spinners, flap canoes, landing gear)
 */

export function createAirlinerBodyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Base Fuselage: Pristine aeronautical white
  ctx.fillStyle = '#fcfdfe';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle fuselage panel lines & rivet rows
  ctx.strokeStyle = '#e2e5eb';
  ctx.lineWidth = 1.5;
  for (let x = 120; x < canvas.width; x += 110) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw on both top/bottom halves (port and starboard fuselage halves)
  [260, 760].forEach((midY, halfIdx) => {
    const isPort = halfIdx === 0;

    // 2. Bold Scarlet Red Aerodynamic Swoop Ribbon
    // Exactly matching 11803_Airplane_body_diff.jpg
    ctx.save();
    ctx.fillStyle = '#e8141f';
    ctx.beginPath();
    // Starting near nose
    ctx.moveTo(400, midY + 15);
    ctx.bezierCurveTo(600, midY + 15, 800, midY - 60, 1050, midY - 20);
    ctx.bezierCurveTo(1300, midY + 20, 1500, midY - 120, 1920, midY - 180);
    ctx.lineTo(2048, midY - 190);
    ctx.lineTo(2048, midY - 70);
    ctx.bezierCurveTo(1700, midY + 10, 1300, midY + 90, 1050, midY + 40);
    ctx.bezierCurveTo(800, midY - 10, 600, midY + 50, 400, midY + 45);
    ctx.closePath();
    ctx.fill();

    // Secondary thin dynamic accent line
    ctx.strokeStyle = '#e8141f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(350, midY + 30);
    ctx.bezierCurveTo(550, midY + 30, 750, midY - 40, 1000, midY - 5);
    ctx.stroke();
    ctx.restore();

    // 3. Stylized "Airplane" Cursive Aero Typography
    ctx.save();
    ctx.translate(1420, midY - 45);
    if (!isPort) {
      // Flip for other side if needed or keep legible
    }
    ctx.font = 'italic 900 68px "Brush Script MT", "Playfair Display", "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111317';
    ctx.lineWidth = 10;
    ctx.strokeText('Airplane', 0, 0);
    ctx.fillText('Airplane', 0, 0);

    // Red script flourish over text
    ctx.fillStyle = '#e8141f';
    ctx.font = 'italic 900 48px "Brush Script MT", "Playfair Display", sans-serif';
    ctx.fillText('Air', -50, -25);
    ctx.restore();

    // 4. Sponsor Decals & Aviation Markings Grid (matching texture)
    ctx.save();
    const decalX = 720;
    const decalY = midY + 65;
    const decalColors = ['#1d4ed8', '#e8141f', '#047857', '#d97706', '#111827'];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        ctx.fillStyle = decalColors[(row * 6 + col) % decalColors.length];
        ctx.fillRect(decalX + col * 42, decalY + row * 18, 30, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(decalX + col * 42 + 2, decalY + row * 18 + 2, 8, 6);
      }
    }
    // Technical registration mark
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('D-3262', decalX + 280, decalY + 16);
    ctx.restore();

    // 5. Cockpit Windshield Windows (6-pane angled dark grey glass)
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    const cpX = 220;
    const cpY = midY - 70;
    for (let p = 0; p < 3; p++) {
      ctx.beginPath();
      ctx.moveTo(cpX + p * 38, cpY);
      ctx.lineTo(cpX + (p + 1) * 38 - 6, cpY + (p === 0 ? 8 : 0));
      ctx.lineTo(cpX + (p + 1) * 38 - 10, cpY + 36);
      ctx.lineTo(cpX + p * 38, cpY + 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 6. Cabin Passenger Windows Strip
    ctx.save();
    const winStart = 380;
    const winEnd = 1650;
    const winStep = 32;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    for (let wx = winStart; wx < winEnd; wx += winStep) {
      // Skip over exit door area
      if (Math.abs(wx - 920) < 25) {
        // Passenger door outline
        ctx.strokeStyle = '#e8141f';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(wx - 10, midY - 55, 24, 75);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        continue;
      }
      ctx.beginPath();
      ctx.roundRect(wx, midY - 32, 14, 22, 6);
      ctx.fill();
      ctx.stroke();

      // Window reflection glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(wx + 2, midY - 30, 4, 18);
      ctx.fillStyle = '#1e293b';
    }
    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createAirlinerTailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background: Deep racing red matching 11803_Airplane_tail_diff.jpg
  ctx.fillStyle = '#e8141f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dynamic White Aerodynamic Tail Wave Swirls
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(120, 800);
  ctx.bezierCurveTo(300, 750, 450, 400, 320, 200);
  ctx.bezierCurveTo(450, 280, 520, 520, 350, 850);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(500, 950);
  ctx.bezierCurveTo(620, 850, 750, 500, 600, 250);
  ctx.bezierCurveTo(750, 360, 860, 650, 700, 980);
  ctx.closePath();
  ctx.fill();

  // "Airplane" Script on Tail fin
  ctx.save();
  ctx.translate(480, 550);
  ctx.rotate(-Math.PI / 4.5);
  ctx.font = 'italic bold 76px "Brush Script MT", "Playfair Display", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Airplane', 0, 0);
  ctx.restore();

  // Rudder trim line
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(850, 0);
  ctx.lineTo(850, canvas.height);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createAirlinerWingTexture(isLeft: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Aeronautical Light Grey Wing Skin (matching 11803_Airplane_wing_big_L/R)
  ctx.fillStyle = '#d8dbe0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Control Surface Panels (Ailerons, Flaps, Spoilers)
  ctx.fillStyle = '#c7cbd2';
  ctx.fillRect(200, 650, 750, 260);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  for (let x = 200; x < 950; x += 150) {
    ctx.beginPath();
    ctx.moveTo(x, 650);
    ctx.lineTo(x, 910);
    ctx.stroke();
  }

  // 3. Maintenance Walkway Boundary (Black Dotted Lines)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(150, 220);
  ctx.lineTo(820, 220);
  ctx.lineTo(820, 620);
  ctx.lineTo(150, 620);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Prominent Registration Mark: "D-3262" (Exact mark from user's texture!)
  ctx.save();
  ctx.translate(520, 420);
  if (!isLeft) {
    ctx.rotate(0.22);
  } else {
    ctx.rotate(-0.22);
  }
  ctx.font = '900 115px "Arial", sans-serif';
  ctx.fillStyle = '#0a0d14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D-3262', 0, 0);
  ctx.restore();

  // 5. Red Double-Chevron Winglet Tips
  ctx.fillStyle = '#e8141f';
  ctx.beginPath();
  ctx.moveTo(880, 80);
  ctx.lineTo(1024, 80);
  ctx.lineTo(960, 240);
  ctx.lineTo(880, 240);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(880, 280);
  ctx.lineTo(960, 280);
  ctx.lineTo(900, 420);
  ctx.lineTo(840, 420);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createAirlinerTurbofanTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Crisp white cowling
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Red livery racing stripe along engine nacelle
  ctx.fillStyle = '#e8141f';
  ctx.fillRect(0, 200, canvas.width, 42);

  // Chrome intake cowl rim & titanium exhaust ring
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 50, canvas.height);
  ctx.fillStyle = '#475569';
  ctx.fillRect(canvas.width - 70, 0, 70, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
