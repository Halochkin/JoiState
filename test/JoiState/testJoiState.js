import {JoiStore} from "../../src/JoiStore.js";

describe('JoiStore basics', function () {

  it("new JoiStore", function () {
    const startState = {
      a: "a string"
    };
    const state = new JoiStore(startState);
    expect(state.state).to.deep.equal({a: "a string"});
  });

  it(".dispatch -> .bindObserve", function () {

    const reducerOne = function (state, d) {
      state.reducerOne = d;
    };
    const state = new JoiStore({a: "a string"});
    state.observe([""], newState => expect(newState).to.deep.equal({a: "a string", reducerOne: "reduceData"}));
    state.dispatch(reducerOne, "reduceData");
  });

  it(".bindCompute x2", function () {
    let testValue = {
      a: "a string",
      reducerOne: "reduceData2",
      _computeOne: "a stringreduceData2",
      _computeTwo: "a stringreduceData2|a string"
    };
    const reducerOne = function (state, e) {
      state.reducerOne = e;
    };
    const computeOne = function (a, testOne) {
      return a + testOne;
    };
    const computeTwo = function (_computeOne, a) {
      return _computeOne + "|" + a;
    };
    const state = new JoiStore({a: "a string"});
    state.compute(["a", "reducerOne"], "_computeOne", computeOne);
    state.compute(["_computeOne", "a"], "_computeTwo", computeTwo);
    state.onComplete(newState => expect(newState).to.deep.equal(testValue));
    state.dispatch(reducerOne, "reduceData2");
  });

  it(".bindObserve", function () {
    let testValue = {
      a: "a string",
      reducerOne: "reduceData",
      _computeOne: "a stringreduceData",
      _computeTwo: "a stringreduceData|a string"
    };
    const reducerOne = function (state, e) {
      state.reducerOne = e;
    };
    const computeOne = function (a, testOne) {
      return a + testOne;
    };
    const computeTwo = function (_computeOne, a) {
      return _computeOne + "|" + a;
    };
    const observeOne = function (prop) {
      window.computeTwoTestValue = prop;
    };

    const state = new JoiStore({a: "a string"});
    state.compute(["a", "reducerOne"], "_computeOne", computeOne);
    state.compute(["_computeOne", "a"], "_computeTwo", computeTwo);
    state.observe(["_computeTwo"], observeOne);
    state.onComplete(newState => {
      expect(newState).to.deep.equal(testValue);
      expect(window.computeTwoTestValue).to.be.equal("a stringreduceData|a string");
    });
    state.dispatch(reducerOne, "reduceData");
  });

  it(".bindObserve(func, ['']) - listen to changes on the entire state object", function () {
    function reducerOne(state, e) {
      state.a = e;
    }

    const onNewState = function (newState) {
      expect(newState).to.deep.equal({a: "hello"});
    };
    const state = new JoiStore({a: "a string"});
    state.observe([""], onNewState);
    state.dispatch(reducerOne, "a string");                                    //should not trigger observe on root
    Promise.resolve().then(()=> state.dispatch(reducerOne, "hello"));          //should trigger observe on root
  });

  it(".bindCompute() - combining two parts of the state 1", function () {
    const startState = {
      users: {
        ab: "AB",
        ba: {
          name: "BA",
          address: "BA home"
        }
      },
    };
    const endState = Object.assign({user: "ab", _userName: "AB"}, startState);

    function reducerOne(state, e) {
      state.user = e;
    }

    const computeOne = function (users, username) {
      return users[username];
    };

    const state = new JoiStore(startState);
    state.compute(["users", "user"], "_userName", computeOne);
    state.onComplete(newState => expect(newState).to.deep.equal(endState));
    state.dispatch(reducerOne, "ab");
  });

  it(".bindCompute() - combining two parts of the state 2", function () {
    const startState = {
      users: {
        ab: "AB",
        ba: {
          name: "BA",
          address: "BA home"
        }
      },
    };
    const endState = Object.assign({user: "ba", _userName: {name: "BA", address: "BA home"}}, startState);

    function reducerOne(state, e) {
      state.user = e;
    }

    const computeOne = function (users, username) {
      return users[username];
    };

    const state = new JoiStore(startState);
    state.compute(["users", "user"], "_userName", computeOne);
    state.onComplete(newState => expect(newState).to.deep.equal(endState));
    state.dispatch(reducerOne, "ba");
  });

  it("NaN !== NaN. Values changing from NaN to NaN is not considered a change in JoiCompute", function () {
    function reducerOne(state, e) {
      state.a = e;
    }

    const sum = function (a, b) {
      return a + b;  //returns NaN when a or b is not a number
    };
    const state = new JoiStore({a: 1});
    state.compute(["a", "_c"], "_b", sum);
    state.compute(["a", "_b"], "_c", sum);
    state.onComplete(newState => {
      expect(newState.a).to.be.equal(2);
      expect(newState._b).to.be.NaN;
      expect(newState._c).to.be.NaN;
    });
    state.dispatch(reducerOne, 2);
  });

  it("confusable computers / observers paths", function () {
    const startState = {
      a: {
        b: 2
      },
      b: {
        c: 9
      },
      c: 1
    };
    const state = new JoiStore(startState);

    function reducerOne(state, e) {
      state.user = e;
    }

    const computeOne = function (a, b) {
      return JSON.stringify(a) + JSON.stringify(b);
    };
    let counter = 0;
    const observeOne = function (a, b) {
      window["whatever_" + counter++] = JSON.stringify(a) + JSON.stringify(b);
    };
    state.compute(["a.b", "c"], "_d1", computeOne);
    state.compute(["a", "b.c"], "_d2", computeOne);   // same computer function, different paths and return value
    state.compute(["a", "b.c"], "_d3", computeOne);   // same computer function, different return value only
    state.compute(["a.b", "c"], "_d4", computeOne);
    state.compute(["a", "b.c"], "_d4", computeOne);   // two computer functions writing to the same path, only the last should be active.
    state.observe(["a.b", "c"], observeOne);
    state.observe(["a", "b.c"], observeOne);          // same observer function, different paths
    state.observe(["a", "b.c"], computeOne);          // should not throw any Errors

    const testValue = Object.assign({}, startState);
    testValue.user = "JohnSmith";
    testValue._d1 = "21";
    testValue._d2 = '{"b":2}9';
    testValue._d3 = '{"b":2}9';
    testValue._d4 = '{"b":2}9';
    state.onComplete(newState => {
      expect(newState).to.deep.equal(testValue);
      expect(window.whatever_0).to.be.equal("21");
      expect(window.whatever_1).to.be.equal('{"b":2}9');
    });
    state.dispatch(reducerOne, "JohnSmith");
  });
});