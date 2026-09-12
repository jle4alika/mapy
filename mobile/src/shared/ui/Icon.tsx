import React from 'react';
import { Platform, StyleProp, TextStyle } from 'react-native';
import type { IconType } from 'react-icons';
import {
  FiMap,
  FiMessageCircle,
  FiUsers,
  FiUser,
  FiPlus,
  FiMinus,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiLock,
  FiNavigation,
  FiHome,
  FiLogOut,
  FiCamera,
  FiSend,
  FiSearch,
  FiBell,
  FiSettings,
  FiMapPin,
  FiCoffee,
  FiShoppingBag,
  FiEye,
  FiEyeOff,
  FiUserPlus,
  FiClock,
  FiShield,
  FiInfo,
  FiAlertCircle,
  FiImage,
  FiMic,
  FiPaperclip,
  FiStar,
  FiSmile,
  FiShare2,
  FiSun,
  FiMoon,
  FiLayers,
} from 'react-icons/fi';
import { LuFuel, LuTrees, LuTrainFront } from 'react-icons/lu';
import {
  HiOutlineMap,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCheck,
  HiOutlineLockClosed,
  HiOutlinePaperAirplane,
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineCog6Tooth,
  HiOutlineMapPin,
  HiOutlineHome,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCamera,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUserPlus,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineExclamationCircle,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlinePhoto,
  HiOutlineMicrophone,
  HiOutlinePaperClip,
  HiOutlineStar,
  HiOutlineFaceSmile,
  HiOutlineShare,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineSquare2Stack,
} from 'react-icons/hi2';
import { Feather, Ionicons } from '@expo/vector-icons';

/**
 * Только Feather (fi) / Heroicons (hi) + точечные Lucide для категорий карты.
 */
export type IconName =
  | 'map'
  | 'chats'
  | 'friends'
  | 'profile'
  | 'plus'
  | 'minus'
  | 'close'
  | 'back'
  | 'forward'
  | 'check'
  | 'lock'
  | 'navigation'
  | 'home'
  | 'logout'
  | 'camera'
  | 'send'
  | 'search'
  | 'bell'
  | 'settings'
  | 'pin'
  | 'cafe'
  | 'gas'
  | 'shop'
  | 'transit'
  | 'park'
  | 'eye'
  | 'eyeOff'
  | 'userPlus'
  | 'clock'
  | 'shield'
  | 'info'
  | 'alert'
  | 'image'
  | 'mic'
  | 'attach'
  | 'star'
  | 'smile'
  | 'share'
  | 'sun'
  | 'moon'
  | 'layers';

export type IconPack = 'fi' | 'hi';

type Props = {
  name: IconName;
  pack?: IconPack;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

const FI_WEB: Record<IconName, IconType> = {
  map: FiMap,
  chats: FiMessageCircle,
  friends: FiUsers,
  profile: FiUser,
  plus: FiPlus,
  minus: FiMinus,
  close: FiX,
  back: FiChevronLeft,
  forward: FiChevronRight,
  check: FiCheck,
  lock: FiLock,
  navigation: FiNavigation,
  home: FiHome,
  logout: FiLogOut,
  camera: FiCamera,
  send: FiSend,
  search: FiSearch,
  bell: FiBell,
  settings: FiSettings,
  pin: FiMapPin,
  cafe: FiCoffee,
  gas: LuFuel,
  shop: FiShoppingBag,
  transit: LuTrainFront,
  park: LuTrees,
  eye: FiEye,
  eyeOff: FiEyeOff,
  userPlus: FiUserPlus,
  clock: FiClock,
  shield: FiShield,
  info: FiInfo,
  alert: FiAlertCircle,
  image: FiImage,
  mic: FiMic,
  attach: FiPaperclip,
  star: FiStar,
  smile: FiSmile,
  share: FiShare2,
  sun: FiSun,
  moon: FiMoon,
  layers: FiLayers,
};

const HI_WEB: Record<IconName, IconType> = {
  map: HiOutlineMap,
  chats: HiOutlineChatBubbleLeftRight,
  friends: HiOutlineUserGroup,
  profile: HiOutlineUser,
  plus: HiOutlinePlus,
  minus: HiOutlineMinus,
  close: HiOutlineXMark,
  back: HiOutlineChevronLeft,
  forward: HiOutlineChevronRight,
  check: HiOutlineCheck,
  lock: HiOutlineLockClosed,
  navigation: HiOutlinePaperAirplane,
  home: HiOutlineHome,
  logout: HiOutlineArrowRightOnRectangle,
  camera: HiOutlineCamera,
  send: HiOutlinePaperAirplane,
  search: HiOutlineMagnifyingGlass,
  bell: HiOutlineBell,
  settings: HiOutlineCog6Tooth,
  pin: HiOutlineMapPin,
  cafe: FiCoffee,
  gas: LuFuel,
  shop: HiOutlineShoppingBag,
  transit: HiOutlineTruck,
  park: LuTrees,
  eye: HiOutlineEye,
  eyeOff: HiOutlineEyeSlash,
  userPlus: HiOutlineUserPlus,
  clock: HiOutlineClock,
  shield: HiOutlineShieldCheck,
  info: HiOutlineInformationCircle,
  alert: HiOutlineExclamationCircle,
  image: HiOutlinePhoto,
  mic: HiOutlineMicrophone,
  attach: HiOutlinePaperClip,
  star: HiOutlineStar,
  smile: HiOutlineFaceSmile,
  share: HiOutlineShare,
  sun: HiOutlineSun,
  moon: HiOutlineMoon,
  layers: HiOutlineSquare2Stack,
};

const FI_NATIVE: Record<IconName, React.ComponentProps<typeof Feather>['name']> = {
  map: 'map',
  chats: 'message-circle',
  friends: 'users',
  profile: 'user',
  plus: 'plus',
  minus: 'minus',
  close: 'x',
  back: 'chevron-left',
  forward: 'chevron-right',
  check: 'check',
  lock: 'lock',
  navigation: 'navigation',
  home: 'home',
  logout: 'log-out',
  camera: 'camera',
  send: 'send',
  search: 'search',
  bell: 'bell',
  settings: 'settings',
  pin: 'map-pin',
  cafe: 'coffee',
  gas: 'droplet',
  shop: 'shopping-bag',
  transit: 'truck',
  park: 'sun',
  eye: 'eye',
  eyeOff: 'eye-off',
  userPlus: 'user-plus',
  clock: 'clock',
  shield: 'shield',
  info: 'info',
  alert: 'alert-circle',
  image: 'image',
  mic: 'mic',
  attach: 'paperclip',
  star: 'star',
  smile: 'smile',
  share: 'share-2',
  sun: 'sun',
  moon: 'moon',
  layers: 'layers',
};

const HI_NATIVE: Record<IconName, React.ComponentProps<typeof Ionicons>['name']> = {
  map: 'map-outline',
  chats: 'chatbubbles-outline',
  friends: 'people-outline',
  profile: 'person-outline',
  plus: 'add-outline',
  minus: 'remove-outline',
  close: 'close-outline',
  back: 'chevron-back-outline',
  forward: 'chevron-forward-outline',
  check: 'checkmark-outline',
  lock: 'lock-closed-outline',
  navigation: 'navigate-outline',
  home: 'home-outline',
  logout: 'log-out-outline',
  camera: 'camera-outline',
  send: 'send-outline',
  search: 'search-outline',
  bell: 'notifications-outline',
  settings: 'settings-outline',
  pin: 'location-outline',
  cafe: 'cafe-outline',
  gas: 'water-outline',
  shop: 'bag-handle-outline',
  transit: 'bus-outline',
  park: 'leaf-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  userPlus: 'person-add-outline',
  clock: 'time-outline',
  shield: 'shield-checkmark-outline',
  info: 'information-circle-outline',
  alert: 'alert-circle-outline',
  image: 'image-outline',
  mic: 'mic-outline',
  attach: 'attach-outline',
  star: 'star-outline',
  smile: 'happy-outline',
  share: 'share-outline',
  sun: 'sunny-outline',
  moon: 'moon-outline',
  layers: 'layers-outline',
};

export function Icon({ name, pack = 'fi', size = 22, color = '#000', style }: Props) {
  if (Platform.OS === 'web') {
    const Comp = (pack === 'hi' ? HI_WEB : FI_WEB)[name];
    return <Comp size={size} color={color} style={style as object} />;
  }

  if (pack === 'hi') {
    return <Ionicons name={HI_NATIVE[name]} size={size} color={color} style={style} />;
  }
  return <Feather name={FI_NATIVE[name]} size={size} color={color} style={style} />;
}
