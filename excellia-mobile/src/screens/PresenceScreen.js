import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import dayjs from 'dayjs';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { encode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';
import { presenceApi } from '../api/presenceApi';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function PresenceScreen() {
  const { user } = useAuth();
  const now = dayjs();
  const [year, setYear] = useState(String(now.year()));
  const [month, setMonth] = useState(String(now.month() + 1));
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => ({ y: Number(year), m: Number(month) }), [year, month]);
  const isValid = parsed.y >= 2000 && parsed.y <= 2100 && parsed.m >= 1 && parsed.m <= 12;

  const generateAndDownload = async () => {
    if (!isValid) {
      Alert.alert('Invalid Date', 'Please enter a valid year and month (1-12).');
      return;
    }
    setLoading(true);
    try {
      const arrayBuffer = await presenceApi.downloadMy({ year: parsed.y, month: parsed.m });
      const base64 = encode(arrayBuffer);
      const fileName = `Feuille_${user?.employeeId || 'EMP'}_${parsed.y}-${String(parsed.m).padStart(2, '0')}.xlsx`;

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        const SAF = FileSystem.StorageAccessFramework;
        const perm = await SAF.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          const fileUri = await SAF.createFileAsync(perm.directoryUri, fileName, XLSX_MIME);
          await FileSystemLegacy.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
          Alert.alert('Success', 'File downloaded successfully.');
          return;
        }
      }

      const localUri = FileSystemLegacy.documentDirectory + fileName;
      await FileSystemLegacy.writeAsStringAsync(localUri, base64, { encoding: 'base64' });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType: XLSX_MIME, dialogTitle: 'Download File' });
      } else {
        Alert.alert('Saved', `File saved to app storage.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate file. Check network/permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={[typography.header, { marginBottom: spacing.xs }]}>Feuille de présence</Text>
        <Text style={[typography.caption, { marginBottom: spacing.xl }]}>Generate & download your monthly attendance sheet.</Text>

        <View style={styles.card}>
          <View style={styles.rowItem}>
            <Text style={typography.caption}>Employee</Text>
            <Text style={styles.value}>{user?.name}</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={typography.caption}>ID</Text>
            <Text style={[styles.value, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{user?.employeeId}</Text>
          </View>

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Year</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="YYYY" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Month</Text>
              <TextInput style={styles.input} value={month} onChangeText={setMonth} keyboardType="numeric" placeholder="MM" placeholderTextColor={colors.textSecondary} />
            </View>
          </View>

          <Pressable style={[styles.btn, loading && { opacity: 0.7 }]} onPress={generateAndDownload} disabled={loading}>
            <Ionicons name="download-outline" size={24} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>{loading ? 'Generating...' : 'Download .xlsx'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.lg },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: spacing.sm },
  value: { color: colors.text, fontWeight: '700', fontSize: 16 },
  inputRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, marginBottom: 6, fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 12, color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  btn: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});