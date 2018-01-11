describe('test 2 of JoiState', function () {

  const reducerEventName = 'state-test-two';
  const computeTestValue = "computeTestValue2";
  const startState = {
    users: {
      ab: "AB",
      ba: {
        name: "BA",
        address: "BA home"
      }
    },
    //add username: "ab"
    //compute _name: users[username]
    //do the same with a complex object for instead of AB as a string
  };
  const state = new JoiState(startState);

  it("add username and compute a child", function () {
    const reducerOne = function (state, detail) {
      return JoiGraph.setIn(state, "user", detail);
    };
    const computeOne = function (users, username) {
      return users[username];
    };
    state.bindReduce(reducerEventName, reducerOne, true);
    state.bindCompute("_userName", computeOne, ["users", "user"]);
    fireAndSetGlobalVariable(reducerEventName, "ab", computeTestValue);

    const testValue = Object.assign({}, startState);
    testValue.user = "ab";
    testValue._userName = "AB";
    expect(window[computeTestValue]).to.deep.equal(testValue);
  });

  it("add username and compute a child that is complex", function () {
    const reducerOne = function (state, detail) {
      return JoiGraph.setIn(state, "user", detail);
    };
    const computeOne = function (users, username) {
      return users[username];
    };
    state.bindReduce(reducerEventName, reducerOne, true);
    state.bindCompute("_userName", computeOne, ["users", "user"]);
    fireAndSetGlobalVariable(reducerEventName, "ba", computeTestValue);

    const testValue = Object.assign({}, startState);
    testValue.user = "ba";
    testValue._userName = {
      name: "BA",
      address: "BA home"
    };
    expect(window[computeTestValue]).to.deep.equal(testValue);
  });

  //do the same with a complex object for instead of AB as a string
});

