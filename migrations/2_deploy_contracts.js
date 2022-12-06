var Hasher = artifacts.require("./Hasher.sol");

module.exports = function(deployer, _network, accounts) {
  deployer.deploy(Hasher); 
};
