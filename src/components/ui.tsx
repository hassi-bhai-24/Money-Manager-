import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { theme } from '../theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function ProgressBar({
  ratio,
  color,
}: {
  ratio: number;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${clamped * 100}%`, backgroundColor: color ?? theme.colors.primary },
        ]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        danger && styles.buttonDanger,
        (pressed || disabled) && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  } as ViewStyle,
  sectionTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  } as TextStyle,
  empty: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  } as ViewStyle,
  emptyTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  } as TextStyle,
  emptyBody: {
    fontSize: theme.fontSize.small,
    color: theme.colors.muted,
    lineHeight: 19,
  } as TextStyle,
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  } as ViewStyle,
  barFill: {
    height: '100%',
    borderRadius: 5,
  } as ViewStyle,
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  } as ViewStyle,
  buttonDanger: {
    backgroundColor: theme.colors.danger,
  } as ViewStyle,
  buttonPressed: {
    opacity: 0.75,
  } as ViewStyle,
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.body,
    fontWeight: '700',
  } as TextStyle,
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.card,
  } as ViewStyle,
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  } as ViewStyle,
  chipLabel: {
    fontSize: theme.fontSize.small,
    color: theme.colors.text,
  } as TextStyle,
  chipLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  } as TextStyle,
  fieldLabel: {
    fontSize: theme.fontSize.small,
    fontWeight: '600',
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  } as TextStyle,
});
