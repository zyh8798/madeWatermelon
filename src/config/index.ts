export const Height = 1408;
let width = 704;
const { innerWidth, innerHeight } = window;
if (innerHeight > innerWidth * 1.3) {
  width = Height * innerWidth / innerHeight;
  if (width < 320) width = 320;
}
export const Width = width;
export const Ratio = 35;
export const TimeStep = 1 / 120;
export const VelocityIterations = 10;
export const PositionIterations = 10;

export const Fruits = [
  { name: '/madeWatermelon/fruits/fruit_1.png', radius: 26, imgRadius: 26 },
  { name: '/madeWatermelon/fruits/fruit_2.png', radius: 39, imgRadius: 39 },
  { name: '/madeWatermelon/fruits/fruit_3.png', radius: 54, imgRadius: 54 },
  { name: '/madeWatermelon/fruits/fruit_4.png', radius: 59.5, imgRadius: 59.5 },
  { name: '/madeWatermelon/fruits/fruit_5.png', radius: 76, imgRadius: 76 },
  { name: '/madeWatermelon/fruits/fruit_6.png', radius: 91.5, imgRadius: 91.5 },
  { name: '/madeWatermelon/fruits/fruit_7.png', radius: 100, imgRadius: 93 },
  { name: '/madeWatermelon/fruits/fruit_8.png', radius: 115, imgRadius: 129 },
  { name: '/madeWatermelon/fruits/fruit_9.png', radius: 130, imgRadius: 154 },
  { name: '/madeWatermelon/fruits/fruit_10.png', radius: 140, imgRadius: 151 },
  { name: '/madeWatermelon/fruits/fruit_11.png', radius: 150, imgRadius: 202 },
];
