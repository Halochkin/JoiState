import {JoiStore} from "../../src/JoiStore.js";

describe('JoiStore Errors', function () {

  it("JoiStore simple error", function () {
    const reducerFail = function () {
      throw new Error("i should fail");
    };
    const state = new JoiStore();
    state.onError = function (error) {
      expect("Error: i should fail").to.be.equal(error.toString());
    };
    state.dispatch(reducerFail);
  });

  it("JoiStore still works after error", function () {
    const reducerOne = function (state, e) {
      state.a = e;
    };
    const reducerFail = function () {
      throw new Error("i should fail");
    };
    const state = new JoiStore({a: 1});
    state.onError = function (error) {
      expect("Error: i should fail").to.be.equal(error.toString());
    };
    let firstTime = true;
    state.onComplete (newState => {
      if (firstTime) {
        expect(newState.a).to.be.equal(1);
        firstTime = false;
      } else {
        expect(newState.a).to.be.equal(3);
      }
    });
    state.dispatch(reducerFail, null);
    state.dispatch(reducerOne, 3);
  });

  it("make sure an infinite loop happens", function () {
    const expectedErrorMsg =
`JoiStateStackOverflowError: Infinite loop or too complex computes in JoiStore.
[_c = sum(a, _b)]
[_b = sum(a, _c)]
[_c = sum(a, _b)]
[_b = sum(a, _c)]
[_c = sum(a, _b)]
[_b = sum(a, _c)]
[_c = sum(a, _b)]
[_b = sum(a, _c)]
[_c = sum(a, _b)]
[_b = sum(a, _c)]`;
    const reducerOne = function (state, detail) {
      state.a = detail;
    };
    const sum = function (a, b) {
      return (a || 0) + (b || 0);
    };
    const state = new JoiStore({a: 1});
    state.compute(["a", "_c"], "_b", sum);   //infinite loop, when _b is updated,
    try{
      state.compute(["a", "_b"], "_c", sum);   // _c will need to be recalculated, and that triggers update of _b again
    } catch (error) {
      expect(expectedErrorMsg).to.be.equal(error.toString());
    }
  });
});