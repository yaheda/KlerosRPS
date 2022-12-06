import React, { useEffect, useState } from 'react';
import RPS from './contracts/RPS.json';
import Hasher from './contracts/Hasher.json';
import { getWeb3 } from './utils.js';

const states = ['IDLE', 'CREATED', 'JOINED', 'COMMITED', 'REVEALED'];

const moves = ['Null', 'Rock', 'Paper', 'Scissors', 'Spock', 'Lizard'];
const gameState = [];

function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [game, setGame] = useState({state: '0'});
  const [move, setMove] = useState();

  const [hasherContract, setHasherContract] = useState(undefined);
  const [rpsContract, setRpsContract] = useState(undefined);
  const [c2, setC2] = useState(0);
  const [lastAction, setLastAction] = useState(0);
  const [stake, setStake] = useState(0);
  const [timeout, setTimeout] = useState(0);

  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();

      var hash = web3.utils.soliditySha3(
        { type: 'bytes32', value: 'ola' });
      
      
        

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Hasher.networks[networkId];
      const hasherContract = new web3.eth.Contract(
        Hasher.abi,
        deployedNetwork && deployedNetwork.address,
      );


      setWeb3(web3);
      setAccounts(accounts);

      setHasherContract(hasherContract);
    }
    init();
    window.ethereum.on('accountsChanged', accounts => {
      setAccounts(accounts);
    });
  }, []);

  const isReady = () => {
    return (
      typeof hasherContract !== 'undefined' 
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
    );
  };

  const isRPSReady = () => {
    return (
      typeof rpsContract !== 'undefined' 
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
    );
  }

  useEffect(() => {
    if(isReady()) {
      //updateGame();
    }
  }, [accounts, hasherContract, web3]);

  // useEffect(() => {
  //   if(isReady()) {
  //     updateGame();
  //   }
  // }, [c2, lastAction]);

  function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

  async function createGameTransaction(move, salt, player2, stake) {
    var hash = await hasherContract.methods.hash(move, salt).call();
    var rpsContract = await new web3.eth.Contract(RPS.abi)
      .deploy({ 
          data: RPS.bytecode, 
          arguments: [hash, player2] // Writing you arguments in the array
      })
      .send({ from: accounts[0], value: stake });

    setRpsContract(rpsContract);
  }

  async function createGame(e) {
    e.preventDefault();

    const participant = e.target.elements[0].value;
    const stake = e.target.elements[1].value;
    const moveId = e.target.elements[2].value;
    //const salt = getRandomInteger(10, 10000000000);
    const salt = e.target.elements[3].value;

    localStorage.setItem('rps_moveId', moveId);
    localStorage.setItem('rps_salt', salt);

    await createGameTransaction(moveId, salt, participant, stake);
    await updateGame();
  }

  async function updateGame() {
    if (!isRPSReady) return;

    var c2 = await rpsContract.methods.c2().call();
    var stake = await rpsContract.methods.stake().call();
    var lastAction = await rpsContract.methods.lastAction().call();
    var timeout = await rpsContract.methods.lastAction().call();

    setC2(c2);
    setStake(stake);
    setLastAction(lastAction);
    setTimeout(timeout);
  }

  async function play(e) {
    e.preventDefault();

    const moveId = e.target.elements[0].value;
    const stake = e.target.elements[1].value;
    
    await rpsContract.methods.play(moveId).send({ from: accounts[0], value: stake });
    await updateGame();
  }

  async function solve(e) {
    e.preventDefault();

    var moveId = localStorage.getItem('rps_moveId');
    var salt = localStorage.getItem('rps_salt');

    await rpsContract.methods.solve(moveId, salt);
    await updateGame();
  }

  async function joinGame() {
    await contract.methods
      .joinGame(game.id)
      .send({from: accounts[0], value: game.bet});
    await updateGame();
  };

  async function commitMove(e) {
    e.preventDefault();
    const select = e.target.elements[0];
    const moveId = select.options[select.selectedIndex].value;
    const salt = Math.floor(Math.random() * 1000);  
    await contract.methods
      .commitMove(game.id, moveId, salt)
      .send({from: accounts[0]});
    setMove({id: moveId, salt});
    await updateGame();
  };

  async function revealMove() {
    await contract.methods
      .revealMove(game.id, move.id, move.salt)
      .send({from: accounts[0]});
    setMove(undefined);
    await updateGame();
  };

  function getGameState() {
    if (c2 == 0 && lastAction == 0)
      return 0;
    if (c2 == 0 && lastAction > 0)
      return 1;
    if (c2 > 0 && lastAction > 0)
      return 2;
    if (c2 > 0 && lastAction > 0)
      return 3;
  }

  if(typeof game.state === 'undefined') {
    return <div>Loading...</div>;
  }

  return (
    <div className="container">
      <h1 className="text-center">Rock Paper Scissors</h1>
      <p><span>State: </span> 
        {getGameState() == 0 && 'Create Game'}
        {getGameState() == 1 && 'Waiting for player 2 to play'}
        {getGameState() == 2 && 'Waiting for player 1 to solve'}
        {getGameState() == 3 && 'Game over'}
      </p>
      <p>Stake: {stake} wei</p>

      {getGameState() == 0 && <>
        <form onSubmit={e => createGame(e)}>
          <div className="form-group">
            <label>Participant</label>
            <input type="text" className="form-control" id="participant" />
          </div>
          <div className="form-group">
            <label>Bet/Stake</label>
            <input type="number" className="form-control" id="bet" />
          </div>
          <div className="form-group">
            <label>Move ID</label>
            <select className="form-control" id="move">
              {moves.map((move, index) => {
                return <option value={index}>{move}</option>
              })}
              
            </select>
          </div>
          <div className="form-group">
            <label>Salt</label>
            <input type="number" className="form-control" id="salt" />
          </div>
          <button type="submit" className="btn btn-primary">Submit</button>
        </form>
      </>}

      <p>State: {states[game.state]}</p>
      {game.state === '1' ? (
        <>
          <p>Bet: {game.bet}</p>
          <div>
            <h2>Players</h2>
            <ul>
              {game.players.map(player => <li key={player}>{player}</li>)}
            </ul>
          </div>
        </>
      ) : null}

      {game.state === '0' ? (
        <div className="row">
          <div className="col-sm-12">
            <h2>Create Game</h2>
            <form onSubmit={e => createGame(e)}>
              <div className="form-group">
                <label htmlFor="participant">Participant</label>
                <input type="text" className="form-control" id="participant" />
              </div>
              <div className="form-group">
                <label htmlFor="bet">Bet</label>
                <input type="text" className="form-control" id="bet" />
              </div>
              <button type="submit" className="btn btn-primary">Submit</button>
            </form>
          </div>
        </div>
      ) : null}

      {game.state === '1' 
       && game.players[1].toLowerCase() === accounts[0].toLowerCase() ? (
        <div className="row">
          <div className="col-sm-12">
            <h2>Bet</h2>
              <button 
                onClick={e => joinGame()}
                type="submit" 
                className="btn btn-primary"
              >
                Submit
              </button>
          </div>
        </div>
      ) : null}

      {game.state === '2' ? (
        <div className="row">
          <div className="col-sm-12">
            <h2>Commit move</h2>
            <form onSubmit={e => commitMove(e)}>
              <div className="form-group">
                <label htmlFor="move">Move</label>
                <select className="form-control" id="move">
                  <option value="1">Rock</option>
                  <option value="2">Paper</option>
                  <option value="3">Scissors</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Submit</button>
            </form>
          </div>
        </div>
      ) : null}

      {game.state === '3' ? (
        <div className="row">
          <div className="col-sm-12">
            <h2>Reveal move</h2>
            <button 
              onClick={() => revealMove()}
              type="submit" 
              className="btn btn-primary"
            >
              Submit
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
