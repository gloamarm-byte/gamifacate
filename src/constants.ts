export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const CONTRACT_ABI = [
  "function mintWeapon(address to, string memory itemName, string memory description, string memory image) public",
  "function getMyWeapons() public view returns (tuple(string itemName, string description, string image, bool isUsed, address owner)[])",
  "function useWeapon(uint256 tokenId) public",
  "function getWeapon(uint256 tokenId) public view returns (tuple(string itemName, string description, string image, bool isUsed, address owner))",
  "function markAsUsed(uint256 tokenId) public",
  "function imageMinted(string memory image) public view returns (bool)"
];

export const MONSTERS = [
  { name: "Soul Wraith", image: "https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089759/soul_wraith_alt_jibnvu.png", hp: 50, atk: 10 },
  { name: "Tormented Ghoul", image: "https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089759/tormented_ghoul_alt_bv0wkn.png", hp: 60, atk: 12 },
  { name: "Undead Knight", image: "https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089760/undead_knight_alt_zfkml3.png", hp: 80, atk: 15 },
  { name: "Grave Titan", image: "https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089753/grave_titan_alt_fapkid.png", hp: 120, atk: 20 },
  { name: "Zombie Mage", image: "https://res.cloudinary.com/dkyzhwy4w/image/upload/v1760089767/zombie_mage_alt_qcejvr.png", hp: 70, atk: 18 }
];

export const BACKGROUND_IMAGE = "https://res.cloudinary.com/dkyzhwy4w/image/upload/v17600889768/background_me6s3b.jpg";

export const CARDS = [
  { id: 1, name: "โจมตีเบา", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card1_hrglra.png", type: "attack", value: 10, desc: "โจมตีศัตรู 10 หน่วย" },
  { id: 2, name: "โจมตีหนัก", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card2_qckrxt.png", type: "attack", value: 25, desc: "โจมตีศัตรู 25 หน่วย" },
  { id: 3, name: "ป้องกัน", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card3_id1bya.png", type: "defend", value: 15, desc: "ลดความเสียหาย 15 หน่วย" },
  { id: 4, name: "โล่ศักดิ์สิทธิ์", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card4_ayja0l.png", type: "defend", value: 30, desc: "ลดความเสียหาย 30 หน่วย" },
  { id: 5, name: "ฟื้นฟู", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card5_lhq4w8.png", type: "heal", value: 20, desc: "ฟื้นฟูพลังชีวิต 20 หน่วย" },
  { id: 6, name: "ท่าไม้ตาย", image: "https://res.cloudinary.com/dp9xmkdvd/image/upload/v1774592653/card6_nvy664.png", type: "attack", value: 50, desc: "โจมตีศัตรู 50 หน่วย" }
];
