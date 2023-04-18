const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

/**
 * MyPromise 的处理流程函数
 * then 方法里面 return 一个返回值作为下一个 then 方法的参数
 * 如果是 return 一个 MyPromise 对象，那么就需要判断它的状态
 * 如果 then 方法返回的是自己的 MyPromise 对象，则会发生循环调用，这个时候程序会报错
 * */
function resolvePromise(promise2, x, resolve, reject) {
  //If promise and x refer to the same object, reject promise with a TypeError as the reason.
  if (promise2 === x) {
    return reject(
      new TypeError("Chaining cycle detected for promise #<MyPromise>")
    );
  }
  //通过 called 来控制，如果同时调用resolvePromise和rejectPromise，或者对同一参数进行多次调用，则第一个调用优先，其他调用将被忽略。
  let called = false;
  //Otherwise, if x is an object or function
  if (
    x !== null &&
    (Object.prototype.toString.call(x) === "[object Object]" ||
      typeof x === "function")
  ) {
    //如果取回的 x.then 属性的结果为一个异常 e,用 e 作为原因reject promise
    //例如 x 对象有一个属性 then 被使用了 Object.defineProperty(x, 'then',  get() { throw new Error('err') })
    //如果then是一个方法，把 x 当作 this 来调用它，第一个参数为 resolvePromise，第二个参数为 rejectPromise
    try {
      let then = x.then;
      if (typeof then === "function") {
        then.call(
          x,
          (y) => {
            if (called) return;
            called = true;
            //递归执行,并且每次都是一个新的promise实例
            resolvePromise(promise2, y, resolve, reject);
          },
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        if (called) return;
        called = true;
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // 如果x既不是对象也不是函数，用x完成(fulfill)
    resolve(x);
  }
}

class MyPromise {
  status = PENDING; //初始状态
  reason = null; //失败的值
  value = null; //成功的值
  onFulfilledCallbacks = []; //存放成功回调
  onRejectedCallbacks = []; //存放失败回调

  constructor(executor) {
    if (typeof executor !== "function") {
      throw new Error(
        `Uncaught TypeError: MyPromise resolver <${typeof executor}> is not a function`
      );
    }
    const resolve = (value) => {
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.value = value;
        //清空当前的成功回调函数
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (reason) => {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.reason = reason;
        //清空当前的失败回调函数
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    //使用try、catch来捕获执行器中的错误，并且在执行错误的时候将Promise的状态变为失败
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  static resolve(value) {
    return new MyPromise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    });
  }

  static all(promises) {
    if (!Array.isArray(promises)) {
      const type = typeof promises;
      return new TypeError(`TypeError: ${type} ${promises} is not iterable`);
    }

    return new MyPromise((resolve, reject) => {
      let resultArr = [];
      let orderIndex = 0;

      const processResultByKey = (value, index) => {
        resultArr[index] = value;
        if (++orderIndex === promises.length) {
          resolve(resultArr);
        }
      };

      for (let i in promises) {
        const value = promises[i];
        if (value && typeof value.then === "function") {
          value.then((value) => {
            processResultByKey(value, i);
          }, reject);
        } else {
          //处理非promise的值类型
          processResultByKey(value, i);
        }
      }
    });
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      for (let i in promises) {
        let value = promises[i];
        if (value && typeof value.then === "function") {
          value.then(resolve, reject);
        } else {
          resolve(value);
        }
      }
    });
  }

  /**
   * then方法实现逻辑
   * 1、then方法中的参数是可选的
   * 2、当状态为 FULFILLED 时执行 onFulfillment，状态为 REJECTED 时执行 onRejected, 返回一个新的 MyPromise 供链式调用
   */
  then(onFulfilled, onRejected) {
    // 提供默认参数以便可以让then的值"穿透"
    onFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    onRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    // then 方法实现链式调用
    //确保 onFulfilled 和 onRejected 在调用 then 的事件循环之后，并使用新的堆栈。所以需要包裹一层 queueMicrotask 来使用新的堆栈执行任务
    const promise2 = new MyPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        // 在promise/A+规范中，这里要求确保 onFulfilled 和 onRejected 在事件循环调用之后异步执行，并且有一个新的堆栈。
        // 这可以用宏任务机制(如setTimeout或setImmediate)来实现，也可以用微任务机制(如MutationObserver或process.nextTick)来实现。
        // 这里我使用了queueMicrotask 来确保 onFulfilled 和 onRejected 在事件循环调用之后异步执行
        queueMicrotask(() => {
          //如果onFulfilled或onRejected抛出一个异常e,promise2 必须被拒绝（rejected）并把e当作原因
          try {
            const x = onFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      } else if (this.status === REJECTED) {
        queueMicrotask(() => {
          try {
            const x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      } else if (this.status === PENDING) {
        //保存回调函数
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = onFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = onRejected(this.reason);
              resolvePromise(promise2, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    });
    return promise2;
  }

  catch(errCallBack) {
    return this.then(null, errCallBack);
  }

  //finally()方法用于指定不管 MyPromise 对象最后状态如何，都会执行的操作。该方法是 ES2018 引入标准的。
  //不管前面的 MyPromise 是fulfilled还是rejected，都会执行回调函数callback。
  finally(callback) {
    return this.then(
      (value) => {
        return MyPromise.resolve(callback()).then(() => value);
      },
      (reason) => {
        return MyPromise.resolve(callback()).then(() => {
          throw reason;
        });
      }
    );
  }
}

MyPromise.defer = MyPromise.deferred = function () {
  let dfd = {};
  dfd.promise = new MyPromise((resolve, reject) => {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

export default MyPromise;
// module.exports = MyPromise;
