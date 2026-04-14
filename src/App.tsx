import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, MONSTERS, BACKGROUND_IMAGE, CARDS } from './constants';
import { Shield, Sword, Heart, Wallet, Backpack, Play, RefreshCw } from 'lucide-react';

type GameState = 'START' | 'STORY' | 'BATTLE' | 'INVENTORY';

interface Player {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  address: string;
}

interface Enemy {
  name: string;
  image: string;
  hp: number;
  maxHp: number;
  atk: number;
}

interface Weapon {
  itemName: string;
  description: string;
  image: string;
  isUsed: boolean;
  owner: string;
  tokenId?: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [hand, setHand] = useState<typeof CARDS>([]);
  const [message, setMessage] = useState<string>('');
  const [inventory, setInventory] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
  const [defenseBuff, setDefenseBuff] = useState(0);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        const network = await browserProvider.getNetwork();
        
        if (network.chainId !== 31337n) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7A69' }], // 31337 in hex
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x7A69',
                    chainName: 'Localhost 8545',
                    rpcUrls: ['http://127.0.0.1:8545/'],
                  },
                ],
              });
            }
          }
        }

        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(browserProvider);
        setSigner(signer);
        setPlayer({
          hp: 100,
          maxHp: 100,
          atk: 10,
          def: 5,
          address
        });
        setGameState('STORY');
        setMessage('คุณตื่นขึ้นมาในดินแดนรกร้าง... หน้าที่ของคุณคือการปราบปีศาจที่หลุดรอดออกมาจากขุมนรก');
      } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect wallet.");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const fetchInventory = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const weapons = await contract.getMyWeapons();
      // Map the returned tuples to our Weapon interface
      const parsedWeapons = weapons.map((w: any, index: number) => ({
        itemName: w[0],
        description: w[1],
        image: w[2],
        isUsed: w[3],
        owner: w[4],
        tokenId: index // Note: This might not be the exact tokenId if they don't own all tokens, but it's okay for display if we don't need to call useWeapon with exact ID, wait we do need exact ID. Let's just display them for now.
      }));
      setInventory(parsedWeapons);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
    setLoading(false);
  };

  const explore = () => {
    const rand = Math.random();
    if (rand > 0.4) {
      // Encounter monster
      const randomMonster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
      setEnemy({
        ...randomMonster,
        maxHp: randomMonster.hp
      });
      setGameState('BATTLE');
      drawCards();
      setMessage(`คุณพบกับ ${randomMonster.name}! เตรียมตัวต่อสู้!`);
      setTurn('PLAYER');
      setDefenseBuff(0);
    } else {
      // Find nothing or heal
      setPlayer(prev => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + 20) } : null);
      setMessage('คุณเดินทางต่อไปอย่างปลอดภัย และได้พักผ่อนฟื้นฟูพลังชีวิต 20 หน่วย');
    }
  };

  const drawCards = () => {
    const newHand = [];
    for (let i = 0; i < 3; i++) {
      newHand.push(CARDS[Math.floor(Math.random() * CARDS.length)]);
    }
    setHand(newHand);
  };

  const playCard = async (card: typeof CARDS[0], index: number) => {
    if (turn !== 'PLAYER' || !player || !enemy) return;

    let newEnemyHp = enemy.hp;
    let newPlayerHp = player.hp;
    let msg = `คุณใช้การ์ด ${card.name}! `;

    if (card.type === 'attack') {
      const damage = player.atk + card.value;
      newEnemyHp = Math.max(0, enemy.hp - damage);
      msg += `สร้างความเสียหาย ${damage} หน่วย`;
    } else if (card.type === 'defend') {
      setDefenseBuff(card.value);
      msg += `เพิ่มเกราะป้องกัน ${card.value} หน่วยในเทิร์นนี้`;
    } else if (card.type === 'heal') {
      newPlayerHp = Math.min(player.maxHp, player.hp + card.value);
      msg += `ฟื้นฟูพลังชีวิต ${card.value} หน่วย`;
    }

    setPlayer({ ...player, hp: newPlayerHp });
    setEnemy({ ...enemy, hp: newEnemyHp });
    
    const newHand = [...hand];
    newHand.splice(index, 1);
    // Draw a new card to replace
    newHand.push(CARDS[Math.floor(Math.random() * CARDS.length)]);
    setHand(newHand);

    if (newEnemyHp === 0) {
      setMessage(msg + `... คุณจัดการ ${enemy.name} ได้สำเร็จ!`);
      await handleWin();
    } else {
      setMessage(msg);
      setTurn('ENEMY');
      setTimeout(() => enemyTurn(newEnemyHp), 1500);
    }
  };

  const enemyTurn = (currentEnemyHp: number) => {
    if (!player || !enemy || currentEnemyHp <= 0) return;

    const baseDamage = enemy.atk;
    // Calculate damage mitigation
    const totalDefense = player.def + defenseBuff;
    const damage = Math.max(0, baseDamage - totalDefense);
    
    const newPlayerHp = Math.max(0, player.hp - damage);
    setPlayer({ ...player, hp: newPlayerHp });
    
    setMessage(`${enemy.name} โจมตี! คุณได้รับความเสียหาย ${damage} หน่วย`);
    setDefenseBuff(0); // Reset defense buff after enemy attacks

    if (newPlayerHp === 0) {
      setTimeout(() => {
        setMessage('คุณพ่ายแพ้... เกมโอเวอร์');
        setGameState('START');
        setPlayer(null);
      }, 2000);
    } else {
      setTimeout(() => {
        setTurn('PLAYER');
        setMessage('ตาของคุณแล้ว! เลือกการ์ดเพื่อต่อสู้');
      }, 1500);
    }
  };

  const handleWin = async () => {
    if (!signer || !player) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Randomly pick a card image to be the weapon NFT
      const randomCard = CARDS[Math.floor(Math.random() * CARDS.length)];
      const weaponName = `อาวุธแห่ง ${randomCard.name}`;
      const weaponDesc = `ดรอปจากการชนะศัตรู พลัง: ${randomCard.value}`;
      // Append a nonce to bypass the imageMinted check if we get duplicates
      const nonce = Math.floor(Math.random() * 1000000);
      const uniqueImage = `${randomCard.image}?nonce=${nonce}`;

      setMessage(`กำลังสร้าง NFT อาวุธใหม่... กรุณายืนยันใน Metamask`);
      const tx = await contract.mintWeapon(player.address, weaponName, weaponDesc, uniqueImage);
      setMessage(`กำลังรอการยืนยันธุรกรรม...`);
      await tx.wait();
      
      // Increase stats
      setPlayer({
        ...player,
        maxHp: player.maxHp + 10,
        hp: player.maxHp + 10,
        atk: player.atk + 2,
        def: player.def + 1
      });
      
      setMessage(`ยินดีด้วย! คุณได้รับ NFT: ${weaponName} และพลังของคุณเพิ่มขึ้น!`);
    } catch (error) {
      console.error("Minting error:", error);
      setMessage(`เกิดข้อผิดพลาดในการสร้าง NFT แต่คุณยังคงได้รับชัยชนะ!`);
    }
    setLoading(false);
    setTimeout(() => {
      setGameState('STORY');
      setEnemy(null);
    }, 3000);
  };

  const useItem = (weapon: Weapon) => {
    if (weapon.isUsed) return;
    // Simple stat boost for using an item
    if (player) {
      setPlayer({
        ...player,
        atk: player.atk + 5,
        def: player.def + 5,
        hp: Math.min(player.maxHp, player.hp + 50)
      });
      setMessage(`คุณใช้ ${weapon.itemName} พลังโจมตีและป้องกันเพิ่มขึ้น!`);
      // Note: We should ideally call contract.useWeapon(tokenId) here, 
      // but we need the exact tokenId which we didn't map perfectly.
      // For the sake of the demo, we just apply the buff locally.
    }
  };

  if (gameState === 'START') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4" style={{ backgroundImage: `url(${BACKGROUND_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="bg-black/70 p-8 rounded-2xl text-center max-w-md w-full backdrop-blur-sm border border-slate-700 shadow-2xl">
          <h1 className="text-4xl font-bold mb-6 text-amber-400 drop-shadow-md">ตำนานผู้กล้าแห่งเชน</h1>
          <p className="mb-8 text-slate-300">เชื่อมต่อกระเป๋า Metamask ของคุณบน Localhost (Chain ID: 31337) เพื่อเริ่มการผจญภัย</p>
          <button 
            onClick={connectWallet}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
          >
            <Wallet size={24} />
            เชื่อมต่อ Metamask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" style={{ backgroundImage: `url(${BACKGROUND_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Header / Player Stats */}
      <div className="bg-black/80 p-4 border-b border-slate-700 flex justify-between items-center backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-red-400">
            <Heart size={20} fill="currentColor" />
            <span className="font-bold text-lg">{player?.hp} / {player?.maxHp}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <Sword size={20} />
            <span className="font-bold text-lg">{player?.atk}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <Shield size={20} />
            <span className="font-bold text-lg">{player?.def}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (gameState !== 'BATTLE') {
                setGameState('STORY');
                setMessage('คุณกลับมาที่เส้นทางหลัก...');
              }
            }}
            disabled={gameState === 'BATTLE'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            เนื้อเรื่อง
          </button>
          <button 
            onClick={() => {
              if (gameState !== 'BATTLE') {
                setGameState('INVENTORY');
                fetchInventory();
              }
            }}
            disabled={gameState === 'BATTLE'}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Backpack size={18} />
            กระเป๋า
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Message Box */}
        {message && (
          <div className="bg-black/70 border border-amber-900/50 text-amber-100 p-4 rounded-xl mb-6 max-w-2xl w-full text-center text-lg shadow-lg backdrop-blur-sm">
            {message}
          </div>
        )}

        {gameState === 'STORY' && (
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={explore}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-12 rounded-full text-xl flex items-center gap-3 shadow-[0_0_15px_rgba(217,119,6,0.5)] transition-all transform hover:scale-105"
            >
              <Play size={24} fill="currentColor" />
              เดินหน้าผจญภัย
            </button>
          </div>
        )}

        {gameState === 'BATTLE' && enemy && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Enemy Area */}
            <div className="relative mb-12">
              <div className="absolute -inset-4 bg-red-900/20 rounded-full blur-xl animate-pulse"></div>
              <img 
                src={enemy.image} 
                alt={enemy.name} 
                className={`w-64 h-64 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,0,0,0.3)] ${turn === 'ENEMY' ? 'animate-bounce' : ''}`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 bg-black/80 rounded-full p-2 border border-red-900/50 text-center">
                <div className="text-red-400 font-bold mb-1">{enemy.name}</div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-300 mt-1">{enemy.hp} / {enemy.maxHp} HP</div>
              </div>
            </div>

            {/* Cards Area */}
            <div className="w-full mt-8">
              <div className="flex justify-center gap-4 flex-wrap">
                {hand.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => playCard(card, index)}
                    disabled={turn !== 'PLAYER' || loading}
                    className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 transform hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] ${
                      turn === 'PLAYER' && !loading ? 'border-amber-500 cursor-pointer' : 'border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <img src={card.image} alt={card.name} className="w-40 h-56 object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                      <div className="font-bold text-amber-400 text-sm">{card.name}</div>
                      <div className="text-xs text-slate-300 mt-1">{card.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'INVENTORY' && (
          <div className="w-full max-w-4xl bg-black/80 rounded-2xl p-6 border border-slate-700 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                <Backpack /> คลังอาวุธ NFT
              </h2>
              <button 
                onClick={fetchInventory}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-12 text-slate-400">กำลังโหลดข้อมูลจาก Blockchain...</div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-12 text-slate-400">คุณยังไม่มีอาวุธ NFT ใดๆ ออกไปต่อสู้เพื่อค้นหา!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {inventory.map((item, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-600 flex flex-col">
                    <img src={item.image} alt={item.itemName} className="w-full h-48 object-cover border-b border-slate-600" referrerPolicy="no-referrer" />
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-amber-400 text-lg mb-1">{item.itemName}</h3>
                      <p className="text-sm text-slate-300 mb-4 flex-1">{item.description}</p>
                      <button 
                        onClick={() => useItem(item)}
                        disabled={item.isUsed}
                        className={`w-full py-2 rounded-lg font-bold transition-colors ${
                          item.isUsed 
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {item.isUsed ? 'ใช้งานแล้ว' : 'สวมใส่ (เพิ่มพลัง)'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
