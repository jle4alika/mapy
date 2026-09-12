import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as DocumentPicker from 'expo-document-picker';
import { v4 as uuidv4 } from 'uuid';

import type { Message, MessageAttachment } from '../../../src/entities/types';
import { chatsApi, mapApi } from '../../../src/shared/api/endpoints';
import { mediaUrl } from '../../../src/shared/config/env';
import { useDraftStore } from '../../../src/features/chat/draft-store';
import { useOutboxStore } from '../../../src/features/chat/outbox-store';
import { useSessionStore } from '../../../src/features/auth/session-store';
import { useMapUiStore } from '../../../src/features/map/map-ui-store';
import {
  formatFriendPresence,
  friendPresenceClickable,
} from '../../../src/features/presence/friendPresence';
import { useGatewaySubscribe } from '../../../src/features/realtime/GatewayProvider';
import { Avatar, Icon, Input, Typography, fonts, radii, space } from '../../../src/shared/ui';
import type { IconName } from '../../../src/shared/ui/Icon';
import { useTheme } from '../../../src/shared/ui/ThemeProvider';
import {
  useAppContentMaxWidth,
  useContentPadding,
  useMainSceneOffset,
} from '../../../src/shared/hooks/useBreakpoint';
import { showError } from '../../../src/features/notifications/toast-store';
import { EmojiPicker } from '../../../src/widgets/chat/EmojiPicker';
import { MessageContextMenu } from '../../../src/widgets/chat/MessageContextMenu';
import { ReactionChips } from '../../../src/widgets/chat/ReactionChips';

type PendingMedia = {
  localUri: string;
  fileName: string;
  mime: string;
  kind: 'image' | 'video' | 'audio' | 'file';
};

function fileLabel(att: MessageAttachment): string {
  if (att.kind === 'image') return 'Фото';
  if (att.kind === 'video') return 'Видео';
  if (att.kind === 'audio') return 'Аудио';
  const fromUrl = att.url.split('/').pop()?.split('?')[0];
  return fromUrl || 'Файл';
}

function AttachmentView({
  att,
  mine,
  ink,
  muted,
}: {
  att: MessageAttachment;
  mine: boolean;
  ink: string;
  muted: string;
}) {
  const url = mediaUrl(att.url) ?? att.url;
  if (att.kind === 'image') {
    return (
      <Pressable onPress={() => Linking.openURL(url)} style={styles.mediaWrap}>
        <Image
          source={{ uri: url }}
          style={styles.mediaImage}
          resizeMode="cover"
          // @ts-expect-error RN-web
          accessibilityRole="image"
        />
      </Pressable>
    );
  }
  const icon: IconName =
    att.kind === 'video' ? 'camera' : att.kind === 'audio' ? 'mic' : 'attach';
  const sizeHint =
    att.size_bytes && att.size_bytes > 0
      ? att.size_bytes >= 1_048_576
        ? `${(att.size_bytes / 1_048_576).toFixed(1)} МБ`
        : `${Math.max(1, Math.round(att.size_bytes / 1024))} КБ`
      : null;
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[
        styles.fileCard,
        {
          backgroundColor: mine ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.04)',
        },
      ]}
    >
      <View
        style={[
          styles.fileIcon,
          { backgroundColor: mine ? 'rgba(255,255,255,0.22)' : 'rgba(0,102,255,0.12)' },
        ]}
      >
        <Icon name={icon} pack="fi" size={18} color={mine ? '#fff' : ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Typography color={mine ? '#fff' : ink} numberOfLines={2} style={{ fontFamily: fonts.bodyMedium }}>
          {fileLabel(att)}
        </Typography>
        {sizeHint || att.mime ? (
          <Typography variant="caption" color={mine ? 'rgba(255,255,255,0.75)' : muted} numberOfLines={1}>
            {[sizeHint, att.mime].filter(Boolean).join(' · ')}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

function authorLabel(m: Message, meId?: string | null): string {
  if (m.author_id === meId) return 'Вы';
  return (
    m.author_display_name?.trim() ||
    (m.author_username ? `@${m.author_username}` : '') ||
    'Участник'
  );
}

function previewText(m: Message | undefined): string {
  if (!m || m.deleted_at) return 'Сообщение';
  if (m.body?.trim()) return m.body.trim();
  const kind = m.attachments?.[0]?.kind;
  if (kind === 'image') return 'Фото';
  if (kind === 'video') return 'Видео';
  if (kind === 'audio') return 'Аудио';
  if (kind === 'file') return 'Файл';
  return 'Сообщение';
}

export default function ChatThreadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const pad = useContentPadding();
  const maxW = useAppContentMaxWidth();
  const offset = useMainSceneOffset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = String(id);
  const me = useSessionStore((s) => s.user?.id);
  const meUser = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const requestFocus = useMapUiStore((s) => s.requestFocus);
  const draft = useDraftStore((s) => s.drafts[chatId] ?? '');
  const setDraft = useDraftStore((s) => s.setDraft);
  const clearDraft = useDraftStore((s) => s.clearDraft);
  const enqueue = useOutboxStore((s) => s.enqueue);
  const flush = useOutboxStore((s) => s.flush);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menuMsg, setMenuMsg] = useState<Message | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactPickerFor, setReactPickerFor] = useState<Message | null>(null);
  const sendingRef = useRef(false);

  const chatsQuery = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.list(),
  });

  const chatMeta = useMemo(
    () => (chatsQuery.data ?? []).find((c) => c.id === chatId),
    [chatsQuery.data, chatId],
  );

  const friendsQuery = useQuery({
    queryKey: ['map', 'friends'],
    queryFn: () => mapApi.friends(),
    enabled: chatMeta?.kind === 'direct' && !!chatMeta.peer_user_id,
    refetchInterval: 15_000,
  });

  const peerFriend = useMemo(() => {
    const peerId = chatMeta?.peer_user_id;
    if (!peerId) return null;
    return (friendsQuery.data ?? []).find((f) => f.user_id === peerId) ?? null;
  }, [friendsQuery.data, chatMeta?.peer_user_id]);

  const peerPresence = useMemo(() => {
    if (chatMeta?.kind !== 'direct') return null;
    if (typingUser) return 'печатает…';
    return formatFriendPresence(peerFriend);
  }, [chatMeta?.kind, peerFriend, typingUser]);

  const openPeerOnMap = useCallback(() => {
    if (!friendPresenceClickable(peerFriend)) return;
    requestFocus(peerFriend!.lat, peerFriend!.lon, 16, peerFriend!.user_id);
    router.push('/(main)/map');
  }, [peerFriend, requestFocus, router]);

  useLayoutEffect(() => {
    const title =
      chatMeta?.title?.trim() ||
      (chatMeta?.kind === 'place' ? 'Чат места' : 'Чат');
    const canOpenMap = friendPresenceClickable(peerFriend) && !typingUser;

    navigation.setOptions({
      headerTitleAlign: 'left',
      headerTitle: () => (
        <Pressable
          accessibilityRole={canOpenMap ? 'button' : undefined}
          disabled={!canOpenMap}
          onPress={openPeerOnMap}
          style={headerStyles.titlePress}
        >
          <Typography
            numberOfLines={1}
            style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink }}
          >
            {title}
          </Typography>
          {peerPresence ? (
            <View style={headerStyles.subRow}>
              <View
                style={[
                  headerStyles.dot,
                  {
                    backgroundColor:
                      peerFriend?.derived_status === 'moving'
                        ? colors.accent
                        : peerFriend?.accuracy_mode === 'stale'
                          ? colors.inkMuted
                          : colors.success,
                  },
                ]}
              />
              <Typography
                numberOfLines={1}
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12,
                  lineHeight: 15,
                  color: canOpenMap ? colors.accent : colors.inkMuted,
                  flexShrink: 1,
                }}
              >
                {peerPresence}
                {canOpenMap ? ' · на карте' : ''}
              </Typography>
            </View>
          ) : null}
        </Pressable>
      ),
    });
  }, [
    navigation,
    chatMeta?.title,
    chatMeta?.kind,
    peerPresence,
    peerFriend,
    openPeerOnMap,
    typingUser,
    colors,
  ]);

  const messagesQuery = useQuery({
    queryKey: ['chats', chatId, 'messages'],
    queryFn: () => chatsApi.messages(chatId),
  });

  const messages = useMemo(() => {
    const list = [...(messagesQuery.data ?? [])];
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return list;
  }, [messagesQuery.data]);

  const byId = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.author_id !== me) {
      chatsApi.read(chatId, last.id).catch(() => undefined);
    }
  }, [messages, chatId, me]);

  useGatewaySubscribe(
    useCallback(
      (type, payload) => {
        if (type === 'message.new' && payload.chat_id === chatId) {
          qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) => {
            if (old.some((m) => m.id === payload.id || m.client_message_id === payload.client_message_id)) {
              return old;
            }
            return [...old, { ...(payload as unknown as Message), reactions: [] }];
          });
        }
        if (type === 'message.deleted' && payload.chat_id === chatId) {
          qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) =>
            old.map((m) =>
              m.id === payload.id
                ? { ...m, deleted_at: new Date().toISOString(), body: null, attachments: [], reactions: [] }
                : m,
            ),
          );
        }
        if (type === 'message.reaction' && payload.chat_id === chatId) {
          if (payload.user_id === me) return;
          qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) =>
            old.map((m) => {
              if (m.id !== payload.id) return m;
              const myEmoji = m.reactions?.find((r) => r.me)?.emoji;
              const next = (payload.reactions as Array<{ emoji: string; count: number }> | undefined) ?? [];
              return {
                ...m,
                reactions: next.map((r) => ({
                  emoji: r.emoji,
                  count: r.count,
                  me: !!myEmoji && r.emoji === myEmoji,
                })),
              };
            }),
          );
        }
        if (type === 'typing' && payload.chat_id === chatId && payload.user_id !== me) {
          setTypingUser(String(payload.user_id));
          setTimeout(() => setTypingUser(null), 2000);
        }
      },
      [chatId, me, qc],
    ),
  );

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      text: string;
      media?: PendingMedia | null;
      replyToId?: string | null;
    }) => {
      const client_message_id = uuidv4();
      const text = payload.text.trim();
      let attachments: MessageAttachment[] | undefined;

      if (payload.media) {
        setUploading(true);
        try {
          const uploaded = await chatsApi.uploadMedia(
            chatId,
            payload.media.localUri,
            payload.media.fileName,
            payload.media.mime,
          );
          attachments = [
            {
              kind: uploaded.kind,
              url: uploaded.url,
              mime: uploaded.mime,
              size_bytes: uploaded.size_bytes,
            },
          ];
        } finally {
          setUploading(false);
        }
      }

      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        if (attachments?.length) {
          throw new Error('Медиа можно отправить только онлайн');
        }
        await enqueue({ id: client_message_id, chatId, body: text, client_message_id });
        return {
          id: client_message_id,
          chat_id: chatId,
          author_id: me!,
          body: text,
          client_message_id,
          reply_to_id: payload.replyToId ?? null,
          created_at: new Date().toISOString(),
          attachments: [],
          reactions: [],
        } as Message;
      }
      return chatsApi.send(chatId, text, client_message_id, attachments, payload.replyToId);
    },
    onSuccess: (msg) => {
      clearDraft(chatId);
      setPending(null);
      setReplyTo(null);
      setEmojiOpen(false);
      qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) => {
        if (old.some((m) => m.id === msg.id || m.client_message_id === msg.client_message_id)) return old;
        return [...old, { ...msg, reactions: msg.reactions ?? [] }];
      });
      flush();
    },
    onError: (e) => {
      showError(e, 'Сообщение не отправлено');
    },
  });

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      chatsApi.react(messageId, emoji),
    onSuccess: (updated) => {
      qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) =>
        old.map((m) => (m.id === updated.id ? updated : m)),
      );
    },
    onError: (e) => showError(e, 'Не удалось поставить реакцию'),
  });

  const canSend = (!!draft.trim() || !!pending) && !sendMutation.isPending && !uploading;

  const handleSend = useCallback(() => {
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    sendMutation.mutate(
      { text: draft, media: pending, replyToId: replyTo?.id },
      {
        onSettled: () => {
          sendingRef.current = false;
        },
      },
    );
  }, [canSend, draft, pending, replyTo, sendMutation]);

  const openMenu = useCallback((item: Message) => {
    if (item.deleted_at) return;
    setEmojiOpen(false);
    setMenuMsg(item);
  }, []);

  const pickAttachment = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const mime = (asset.mimeType || 'application/octet-stream').toLowerCase();
      const kind: PendingMedia['kind'] = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('video/')
          ? 'video'
          : mime.startsWith('audio/')
            ? 'audio'
            : 'file';
      setPending({
        localUri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mime,
        kind,
      });
    } catch (e) {
      showError(e, 'Не удалось выбрать файл');
    }
  }, []);

  const selectedReaction = menuMsg?.reactions?.find((r) => r.me)?.emoji ?? null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.canvas, paddingLeft: offset }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <FlatList
        style={styles.listFlex}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: pad,
            maxWidth: maxW,
            width: '100%',
            alignSelf: 'center',
            justifyContent: messages.length ? 'flex-end' : 'center',
            flexGrow: 1,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Typography variant="h3" color={colors.ink} style={{ textAlign: 'center' }}>
              Начните переписку
            </Typography>
            <Typography
              variant="caption"
              color={colors.inkMuted}
              style={{ textAlign: 'center', marginTop: 6 }}
            >
              Напишите сообщение или прикрепите файл
            </Typography>
          </View>
        }
        renderItem={({ item, index }) => {
          const mine = item.author_id === me;
          const deleted = !!item.deleted_at;
          const atts = item.attachments ?? [];
          const reply = item.reply_to_id ? byId.get(item.reply_to_id) : undefined;
          const prev = index > 0 ? messages[index - 1] : undefined;
          const next = index < messages.length - 1 ? messages[index + 1] : undefined;
          const showAuthorName = !mine && (!prev || prev.author_id !== item.author_id);
          const showAuthorAvatar = !mine && (!next || next.author_id !== item.author_id);
          const name = authorLabel(item, me);
          const avatarUri = mine ? meUser?.avatar_url : item.author_avatar_url;
          const avatarName = mine
            ? meUser?.display_name || meUser?.username
            : item.author_display_name || item.author_username;
          const showBody =
            !deleted &&
            !!item.body &&
            !(
              atts.length === 1 &&
              (item.body === 'Фото' ||
                item.body === 'Видео' ||
                item.body === 'Аудио' ||
                item.body === 'Файл' ||
                item.body === 'Вложение')
            );
          return (
            <View
              style={[
                styles.msgRow,
                mine ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' },
              ]}
            >
              {!mine ? (
                <View style={styles.avatarCol}>
                  {showAuthorAvatar ? (
                    <Avatar uri={avatarUri} name={avatarName} size={34} />
                  ) : (
                    <View style={{ width: 34, height: 34 }} />
                  )}
                </View>
              ) : null}
              <View style={[styles.msgBlock, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                {showAuthorName ? (
                  <Typography
                    variant="caption"
                    color={colors.accent}
                    numberOfLines={1}
                    style={styles.authorName}
                  >
                    {name}
                  </Typography>
                ) : null}
                <Pressable
                  onLongPress={() => openMenu(item)}
                  delayLongPress={280}
                  // @ts-expect-error RN-web context menu
                  onContextMenu={(e) => {
                    e?.preventDefault?.();
                    openMenu(item);
                  }}
                  style={[
                    styles.bubble,
                    mine
                      ? { alignSelf: 'flex-end', backgroundColor: colors.accent }
                      : {
                          alignSelf: 'flex-start',
                          backgroundColor: colors.surface,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.border,
                        },
                  ]}
                >
                  {deleted ? (
                    <Typography color={mine ? colors.accentText : colors.inkMuted}>
                      Сообщение удалено
                    </Typography>
                  ) : (
                    <>
                      {reply || item.reply_to_id ? (
                        <View
                          style={[
                            styles.replyQuote,
                            {
                              borderLeftColor: mine ? 'rgba(255,255,255,0.85)' : colors.accent,
                              backgroundColor: mine ? 'rgba(255,255,255,0.14)' : colors.surfaceMuted,
                            },
                          ]}
                        >
                          <Typography
                            variant="caption"
                            color={mine ? colors.accentText : colors.accent}
                            numberOfLines={1}
                            style={{ fontWeight: '600' }}
                          >
                            {reply ? authorLabel(reply, me) : 'Сообщение'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={mine ? 'rgba(255,255,255,0.85)' : colors.inkMuted}
                            numberOfLines={2}
                          >
                            {previewText(reply)}
                          </Typography>
                        </View>
                      ) : null}
                      {atts.map((att, idx) => (
                        <AttachmentView
                          key={att.id || `${att.url}-${idx}`}
                          att={att}
                          mine={mine}
                          ink={colors.ink}
                          muted={colors.inkMuted}
                        />
                      ))}
                      {showBody ? (
                        <Typography color={mine ? colors.accentText : colors.ink}>{item.body}</Typography>
                      ) : null}
                    </>
                  )}
                </Pressable>
                {!deleted ? (
                  <ReactionChips
                    reactions={item.reactions ?? []}
                    mine={mine}
                    onPressEmoji={(emoji) => reactMutation.mutate({ messageId: item.id, emoji })}
                  />
                ) : null}
              </View>
            </View>
          );
        }}
      />
      {typingUser ? (
        <Typography
          variant="caption"
          color={colors.inkMuted}
          style={{ paddingHorizontal: pad, maxWidth: maxW, width: '100%', alignSelf: 'center' }}
        >
          Печатает…
        </Typography>
      ) : null}
      <View
        style={[
          styles.composer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: emojiOpen || reactPickerFor ? 0 : Math.max(insets.bottom, 8),
            paddingHorizontal: pad,
          },
        ]}
      >
        {replyTo ? (
          <View style={[styles.replyBar, { maxWidth: maxW, borderLeftColor: colors.accent }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Typography variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
                Ответ
              </Typography>
              <Typography variant="caption" color={colors.inkMuted} numberOfLines={1}>
                {previewText(replyTo)}
              </Typography>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel="отменить ответ">
              <Icon name="close" pack="fi" size={16} color={colors.inkMuted} />
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.composerInner, { maxWidth: maxW }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="эмодзи"
            onPress={() => {
              setReactPickerFor(null);
              setEmojiOpen((v) => !v);
            }}
            style={[styles.toolBtn, emojiOpen && { opacity: 1 }]}
            hitSlop={6}
          >
            <Icon
              name="smile"
              pack="fi"
              size={22}
              color={emojiOpen ? colors.accent : colors.inkMuted}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="прикрепить файл"
            onPress={pickAttachment}
            style={styles.toolBtn}
            hitSlop={6}
          >
            <Icon name="attach" pack="fi" size={22} color={colors.inkMuted} />
          </Pressable>
          <Input
            containerStyle={styles.composerInputWrap}
            style={styles.composerInput}
            placeholder="Сообщение"
            value={draft}
            multiline
            blurOnSubmit={false}
            returnKeyType="send"
            onChangeText={(t) => setDraft(chatId, t)}
            onFocus={() => {
              setEmojiOpen(false);
              setReactPickerFor(null);
            }}
            onSubmitEditing={() => {
              if (Platform.OS !== 'web') handleSend();
            }}
            // @ts-expect-error RN-web: Enter отправляет, Shift+Enter — новая строка
            onKeyDown={(e) => {
              const key = e?.key ?? e?.nativeEvent?.key;
              if (key !== 'Enter') return;
              if (e?.shiftKey || e?.nativeEvent?.shiftKey) return;
              e?.preventDefault?.();
              e?.nativeEvent?.preventDefault?.();
              handleSend();
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key !== 'Enter') return;
              if (Platform.OS === 'web') return;
              handleSend();
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="отправить"
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.send, { backgroundColor: colors.accent }, !canSend && { opacity: 0.4 }]}
          >
            <Icon name="send" pack="fi" size={16} color={colors.accentText} />
          </Pressable>
        </View>
        {pending ? (
          <View style={[styles.pendingRow, { maxWidth: maxW }]}>
            {pending.kind === 'image' ? (
              <Image source={{ uri: pending.localUri }} style={styles.pendingThumb} />
            ) : (
              <Icon name="attach" pack="fi" size={16} color={colors.inkMuted} />
            )}
            <Typography variant="caption" color={colors.inkMuted} style={{ flex: 1 }} numberOfLines={1}>
              {pending.fileName}
            </Typography>
            <Pressable onPress={() => setPending(null)} accessibilityLabel="убрать вложение">
              <Icon name="close" pack="fi" size={16} color={colors.inkMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <EmojiPicker
        visible={emojiOpen && !reactPickerFor}
        mode="compose"
        onClose={() => setEmojiOpen(false)}
        onPick={(emoji) => setDraft(chatId, draft + emoji)}
      />
      <EmojiPicker
        visible={!!reactPickerFor}
        mode="react"
        onClose={() => setReactPickerFor(null)}
        onPick={(emoji) => {
          if (!reactPickerFor) return;
          reactMutation.mutate({ messageId: reactPickerFor.id, emoji });
          setReactPickerFor(null);
        }}
      />

      <MessageContextMenu
        visible={!!menuMsg}
        mine={menuMsg?.author_id === me}
        selectedEmoji={selectedReaction}
        onClose={() => setMenuMsg(null)}
        onReact={(emoji) => {
          if (!menuMsg) return;
          reactMutation.mutate({ messageId: menuMsg.id, emoji });
          setMenuMsg(null);
        }}
        onReply={() => {
          if (!menuMsg) return;
          setReplyTo(menuMsg);
          setMenuMsg(null);
        }}
        onDelete={
          menuMsg && menuMsg.author_id === me
            ? () => {
                const idToDelete = menuMsg.id;
                setMenuMsg(null);
                chatsApi.softDelete(idToDelete).then((updated) => {
                  qc.setQueryData<Message[]>(['chats', chatId, 'messages'], (old = []) =>
                    old.map((m) => (m.id === updated.id ? updated : m)),
                  );
                });
              }
            : undefined
        }
        onOpenFullEmoji={() => {
          if (!menuMsg) return;
          setReactPickerFor(menuMsg);
          setMenuMsg(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const headerStyles = StyleSheet.create({
  titlePress: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    paddingVertical: 2,
    paddingRight: 8,
    gap: 3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
    minWidth: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  listFlex: { flex: 1 },
  list: { paddingVertical: space.lg, gap: space.sm },
  empty: {
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
    alignItems: 'center',
  },
  msgRow: {
    width: '100%',
    gap: 8,
    marginBottom: space.sm,
    alignItems: 'flex-end',
  },
  avatarCol: {
    width: 34,
    paddingBottom: 2,
  },
  msgBlock: {
    flexShrink: 1,
    maxWidth: '78%',
    minWidth: 0,
    gap: 4,
  },
  authorName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginLeft: 4,
    marginBottom: 2,
    maxWidth: '100%',
  },
  bubble: {
    maxWidth: '100%',
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
    gap: 8,
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    paddingRight: 6,
    borderRadius: 6,
    gap: 1,
  },
  mediaWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 260,
    alignSelf: 'stretch',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    minHeight: 140,
    maxWidth: 260,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    maxWidth: 280,
    minWidth: 160,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  composerInner: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-end',
    width: '100%',
    alignSelf: 'center',
  },
  toolBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  composerInputWrap: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    width: '100%',
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    width: '100%',
    alignSelf: 'center',
  },
  pendingThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});