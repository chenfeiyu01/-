import { Tile, TileType, PlayerColor, HexBuff } from './types';
import { DollarSign, Flag, MapPin, Star, Coffee, AlertCircle, Briefcase, Gamepad2 } from 'lucide-react';
import React from 'react';

export const BOARD_SIZE = 32; 
export const INITIAL_MONEY = 15000;
export const SALARY = 2000; 

// Color mappings for CSS
export const COLOR_MAP: Record<PlayerColor, { bg: string, border: string, text: string, shadow: string, bgLight: string }> = {
  [PlayerColor.RED]:    { bg: 'bg-red-500',    border: 'border-red-900',    text: 'text-white', shadow: 'shadow-red-900',    bgLight: 'bg-red-300' },
  [PlayerColor.BLUE]:   { bg: 'bg-blue-500',   border: 'border-blue-900',   text: 'text-white', shadow: 'shadow-blue-900',   bgLight: 'bg-blue-300' },
  [PlayerColor.GREEN]:  { bg: 'bg-green-500',  border: 'border-green-900',  text: 'text-white', shadow: 'shadow-green-900',  bgLight: 'bg-green-300' },
  [PlayerColor.YELLOW]: { bg: 'bg-yellow-400', border: 'border-yellow-700', text: 'text-black', shadow: 'shadow-yellow-800', bgLight: 'bg-yellow-200' },
  [PlayerColor.PURPLE]: { bg: 'bg-purple-500', border: 'border-purple-900',  text: 'text-white', shadow: 'shadow-purple-900', bgLight: 'bg-purple-300' },
  [PlayerColor.ORANGE]: { bg: 'bg-orange-500', border: 'border-orange-900',  text: 'text-white', shadow: 'shadow-orange-900', bgLight: 'bg-orange-300' },
  [PlayerColor.PINK]:   { bg: 'bg-pink-500',   border: 'border-pink-900',    text: 'text-white', shadow: 'shadow-pink-900',   bgLight: 'bg-pink-300' },
  [PlayerColor.TEAL]:   { bg: 'bg-teal-400',   border: 'border-teal-800',    text: 'text-black', shadow: 'shadow-teal-800',   bgLight: 'bg-teal-200' },
};

// Hextech Buffs System
export const HEX_BUFFS: HexBuff[] = [
  { id: 'h1', name: "利滚利", description: "经过起点时，额外获得当前存款 10% 的利息", icon: "💰", rarity: 'PRISMATIC', effectId: 'BANK_INTEREST' },
  { id: 'h2', name: "包租公", description: "收取的租金增加 30%", icon: "🔑", rarity: 'GOLD', effectId: 'RENT_BOOST' },
  { id: 'h3', name: "避税天堂", description: "免疫所有税收和罚款", icon: "🛡️", rarity: 'GOLD', effectId: 'TAX_EXEMPT' },
  { id: 'h4', name: "工程合同", description: "盖楼/买地 7 折优惠", icon: "🏗️", rarity: 'SILVER', effectId: 'BUILD_DISCOUNT' },
  { id: 'h5', name: "四叶草", description: "经过起点的基础工资翻倍", icon: "🍀", rarity: 'SILVER', effectId: 'SALARY_BOOST' },
  { id: 'h6', name: "吸血鬼", description: "支付租金时，恢复 20% 的金额", icon: "🧛", rarity: 'PRISMATIC', effectId: 'ABSORB_RENT' },
  { id: 'h7', name: "火箭靴", description: "骰子点数 +1", icon: "🚀", rarity: 'SILVER', effectId: 'DICE_BOOST' },
  { id: 'h8', name: "越狱大师", description: "入狱后立即出狱", icon: "🔓", rarity: 'SILVER', effectId: 'JAIL_BREAK' },
  { id: 'h9', name: "妙手空空", description: "每次踩到别人地盘，反而偷取对方 ¥200", icon: "🖐️", rarity: 'GOLD', effectId: 'ROBBERY' },
  { id: 'h10', name: "双子塔", description: "一次盖楼直接提升 2 级", icon: "🏢", rarity: 'PRISMATIC', effectId: 'DOUBLE_BUILD' },
];

// 9x9 Grid = 32 Tiles
export const INITIAL_TILES: Tile[] = [
  // Bottom Row (0-8)
  { id: 0, name: "起点", type: TileType.START, icon: <Flag size={20} strokeWidth={3} />, level: 0 },
  { id: 1, name: "广州", type: TileType.PROPERTY, price: 1000, rent: 200, color: "bg-orange-400", ownerId: null, level: 0 },
  { id: 2, name: "深圳", type: TileType.PROPERTY, price: 1200, rent: 250, color: "bg-orange-400", ownerId: null, level: 0 },
  { id: 3, name: "运气", type: TileType.CHANCE, icon: <Star size={20} strokeWidth={3} />, level: 0 },
  { id: 4, name: "成都", type: TileType.PROPERTY, price: 1500, rent: 300, color: "bg-yellow-400", ownerId: null, level: 0 },
  { id: 5, name: "重庆", type: TileType.PROPERTY, price: 1600, rent: 320, color: "bg-yellow-400", ownerId: null, level: 0 },
  { id: 6, name: "昆明", type: TileType.PROPERTY, price: 1700, rent: 340, color: "bg-yellow-400", ownerId: null, level: 0 },
  { id: 7, name: "赌场", type: TileType.CASINO, icon: <Gamepad2 size={20} strokeWidth={3} />, level: 0 },
  // Corner
  { id: 8, name: "铁窗", type: TileType.JAIL, icon: <MapPin size={20} strokeWidth={3} />, level: 0 }, 
  // Left Col
  { id: 9, name: "武汉", type: TileType.PROPERTY, price: 2000, rent: 400, color: "bg-pink-400", ownerId: null, level: 0 },
  { id: 10, name: "长沙", type: TileType.PROPERTY, price: 2100, rent: 420, color: "bg-pink-400", ownerId: null, level: 0 },
  { id: 11, name: "运气", type: TileType.CHANCE, icon: <Star size={20} strokeWidth={3}/>, level: 0 },
  { id: 12, name: "杭州", type: TileType.PROPERTY, price: 2200, rent: 450, color: "bg-pink-400", ownerId: null, level: 0 },
  { id: 13, name: "南京", type: TileType.PROPERTY, price: 2400, rent: 500, color: "bg-purple-400", ownerId: null, level: 0 },
  { id: 14, name: "苏州", type: TileType.PROPERTY, price: 2600, rent: 550, color: "bg-purple-400", ownerId: null, level: 0 },
  { id: 15, name: "合肥", type: TileType.PROPERTY, price: 2700, rent: 580, color: "bg-purple-400", ownerId: null, level: 0 },
  // Corner
  { id: 16, name: "度假", type: TileType.PARKING, icon: <Coffee size={20} strokeWidth={3}/>, level: 0 }, 
  // Top Row
  { id: 17, name: "天津", type: TileType.PROPERTY, price: 3000, rent: 600, color: "bg-cyan-400", ownerId: null, level: 0 },
  { id: 18, name: "西安", type: TileType.PROPERTY, price: 3200, rent: 650, color: "bg-cyan-400", ownerId: null, level: 0 },
  { id: 19, name: "纳税", type: TileType.TAX, rent: 1000, icon: <DollarSign size={20} strokeWidth={3}/>, level: 0 },
  { id: 20, name: "哈尔滨", type: TileType.PROPERTY, price: 3300, rent: 700, color: "bg-blue-400", ownerId: null, level: 0 },
  { id: 21, name: "大连", type: TileType.PROPERTY, price: 3400, rent: 720, color: "bg-blue-400", ownerId: null, level: 0 },
  { id: 22, name: "香港", type: TileType.PROPERTY, price: 3500, rent: 750, color: "bg-emerald-400", ownerId: null, level: 0 },
  { id: 23, name: "澳门", type: TileType.PROPERTY, price: 3800, rent: 800, color: "bg-emerald-400", ownerId: null, level: 0 },
  // Corner
  { id: 24, name: "被捕", type: TileType.JAIL, icon: <AlertCircle size={20} strokeWidth={3}/>, level: 0 }, 
  // Right Col
  { id: 25, name: "台北", type: TileType.PROPERTY, price: 4200, rent: 900, color: "bg-indigo-400", ownerId: null, level: 0 },
  { id: 26, name: "厦门", type: TileType.PROPERTY, price: 4400, rent: 950, color: "bg-indigo-400", ownerId: null, level: 0 },
  { id: 27, name: "运气", type: TileType.CHANCE, icon: <Star size={20} strokeWidth={3}/>, level: 0 },
  { id: 28, name: "上海", type: TileType.PROPERTY, price: 5000, rent: 1100, color: "bg-red-400", ownerId: null, level: 0 },
  { id: 29, name: "北京", type: TileType.PROPERTY, price: 6000, rent: 1300, color: "bg-red-400", ownerId: null, level: 0 },
  { id: 30, name: "三亚", type: TileType.PROPERTY, price: 6500, rent: 1400, color: "bg-red-400", ownerId: null, level: 0 },
  { id: 31, name: "罚金", type: TileType.TAX, rent: 2000, icon: <Briefcase size={20} strokeWidth={3}/>, level: 0 },
];

export const CHANCE_CARDS = [
  { text: "彩票中奖！+¥2000", money: 2000 },
  { text: "股市熔断！-¥1000", money: -1000 },
  { text: "收到礼金！+¥500", money: 500 },
  { text: "超速罚单！-¥500", money: -500 },
  { text: "捡到钱包！+¥200", money: 200 },
  { text: "请客吃饭！-¥800", money: -800 },
  { text: "银行分红！+¥1500", money: 1500 },
  { text: "手机坏了！-¥1200", money: -1200 },
];

export const POSSIBLE_NAMES = [
  "阿强", "翠花", "建国", "秀莲", "二狗", "铁蛋", "杰克", "肉丝", "大卫", "丽萨"
];

export const PLAYER_CONFIGS = [
  { color: PlayerColor.RED, avatar: "👹" },
  { color: PlayerColor.BLUE, avatar: "🤖" },
  { color: PlayerColor.GREEN, avatar: "👽" },
  { color: PlayerColor.YELLOW, avatar: "😺" },
  { color: PlayerColor.PURPLE, avatar: "👾" },
  { color: PlayerColor.ORANGE, avatar: "🦊" },
  { color: PlayerColor.PINK, avatar: "🦄" },
  { color: PlayerColor.TEAL, avatar: "🐙" },
];