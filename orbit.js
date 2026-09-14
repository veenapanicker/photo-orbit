/* One shared, freely rotatable globe. A staggered spiral avoids visible rows. */
window.PhotoOrbit = (() => {
  const duration = 78000;
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const slots = Array.from({length:21}, (_,i) => {
    const latitude = .89 - i / 20 * 1.78 + Math.sin(i * 2.1) * .035;
    const phase = i * Math.PI * (3 - Math.sqrt(5)) + Math.sin(i * 1.7) * .12;
    const radius = .94 + Math.sin(i * 2.7) * .055;
    const ring = Math.sqrt(1 - latitude ** 2);
    return {x:Math.sin(phase)*ring*radius,y:latitude*radius,z:Math.cos(phase)*ring*radius,
      size:[1,.92,1.06,.96,1.03][i%5],ratio:[.72,1.2,.78,.91,.68,1.12,.75][i%7],tilt:Math.sin(i*2.3)*3};
  });
  function rotate(slot, orientation) {
    const cy=Math.cos(orientation.yaw),sy=Math.sin(orientation.yaw);
    const cp=Math.cos(orientation.pitch),sp=Math.sin(orientation.pitch);
    const x=slot.x*cy+slot.z*sy;
    const z=slot.z*cy-slot.x*sy;
    return {x,y:slot.y*cp+z*sp,z:z*cp-slot.y*sp};
  }
  function project(slot, orientation, width, height) {
    const p=rotate(slot,orientation);
    const perspective=1/(1-p.z*.29);
    const depth=clamp((p.z+1)/2,0,1);
    return {x:width*(.5+(p.x*.38+p.y*.018)*perspective),
      y:height*(.49+(p.y*.32-p.x*.035)*perspective),
      z:p.z,depth,scale:.87*perspective,
      layer:Math.min(6,Math.floor(depth*7)),
      opacity:.4+depth*.6,blur:(1-depth)**1.65*4.4,tilt:slot.tilt+p.x*2};
  }
  // Analytical velocity decay keeps inertia independent of frame rate.
  function coast(velocity,dt) {
    const decay=Math.exp(-dt/480);
    return {delta:velocity*480*(1-decay),velocity:velocity*decay};
  }
  return {slots,rotate,project,coast,duration,autoSpeed:Math.PI*2/duration};
})();
