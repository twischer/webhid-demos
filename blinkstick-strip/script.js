import { RAINBOW, OFF, WHITE, shade } from './colors.js';

// These IDs appear to be shared by all BlinkStick products.
// This demo is for the 8-LED Strip (https://www.blinkstick.com/products/blinkstick-strip)
// https://github.com/arvydas/blinkstick-node/blob/master/blinkstick.js#L22
const vendorId = 0x20a0;
const productId = 0x41e5;

const LED_COUNT = 8;

document.querySelector('button').addEventListener('click', handleClick);

async function handleClick() {
  const device = await getOpenedDevice();

  for (let [ledIndex, color] of nextColorArrangement().entries()) {
    await setColor(device, ledIndex, color);
  }
}

async function getOpenedDevice() {
  let devices = await navigator.hid.getDevices();
  console.log(devices);
  //let device = devices;//.find(d => d.vendorId === vendorId && d.productId === productId);

  if (!devices[0]) {
    devices = await navigator.hid.requestDevice({
      filters: [/*{ vendorId, productId }*/],
    });
  }

  console.log(devices[0]);
  if (!devices[0].opened) {
    try {
    await devices[0].open();
    } catch(e) {
      document.querySelector('button').textContent = devices[0].productName + e;
      console.error(e);
    }
  }

  return devices[0];
}

async function setColor(device, index, [r, g, b], retries = 1) {
  // Limit the brightness (still bright!); at some higher level it starts getting stuck on (overheating?)
  r *= 0.5;
  g *= 0.5;
  b *= 0.5;

  // Info gleaned from https://github.com/arvydas/blinkstick-node/blob/master/blinkstick.js#L429
  const reportId = 5;
  const data = Int8Array.from([reportId, index, r, g, b]);

  try {
    await device.sendFeatureReport(reportId, data);
  } catch (error) {
    if (retries > 0) {
      await setColor(device, index, [r, g, b], --retries);
    } else {
      console.error(`Failed to set color at index ${index}`, error);
    }
  }
}

const nextColorArrangement = (() => {
  const arrangements = [
    // Brightness
    slots(WHITE),
    slots(shade(WHITE, 0.5)),
    slots(shade(WHITE, 0.25)),
    slots(shade(WHITE, 0.1)),

    // Individual control
    slots(i => (i % 2 === 0 ? WHITE : OFF)),
    slots(i => (i % 2 !== 0 ? WHITE : OFF)),

    // Rainbow both directions
    slots(i => RAINBOW[i] || WHITE),
    slots(i => RAINBOW[RAINBOW.length - i] || WHITE),

    // Individual colours
    ...RAINBOW.map(slots),

    slots(OFF),
  ];

  let nextIndex = 0;
  return () => arrangements[nextIndex++ % arrangements.length];

  function slots(color) {
    return Array.from({ length: LED_COUNT }).map((_, i) =>
      typeof color === 'function' ? color(i) : color
    );
  }
})();
