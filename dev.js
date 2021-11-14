const { resolve, reject } = require("./index");
let MyPromise = require("./index");

// let p1 = new MyPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve("promise1");
//   }, 1000);
// });

// let p2 = p1.then(
//   () => {
//     return new MyPromise((resolve, reject) => {
//       setTimeout(() => {
//         resolve(
//           new MyPromise((resolve, reject) => {
//             reject("new Promise reject");
//           })
//         );
//       }, 2000);
//     });
//   },
//   () => {}
// );

// p2.then(
//   (value) => {
//     console.log("p2 resolve:", value);
//   },
//   (reason) => {
//     console.log("p2 reject:", reason);
//   }
// );

let p1 = new MyPromise((resolve, reject) => {
  resolve(1);
});

let p2 = new MyPromise((resolve, reject) => {
  resolve(2);
});

let p3 = new MyPromise((resolve, reject) => {
  resolve(3);
});

// let result = MyPromise.all([p1, p2, p3]);
let result = MyPromise.race([p1, p2, p3]);

result.then((value) => {
  console.log("result: ", value);
});
