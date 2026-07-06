import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMonthData, getCategories, getCards, saveCategory, deleteCategory,
  getCurrentMonthKey, CustomCategory, Expense, Card,
} from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import CategoryFormModal from '@/components/CategoryFormModal';
import CategoryDetailModal from '@/components/CategoryDetailModal';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

export default function CategoriasScreen() {
  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const monthKey = getCurrentMonthKey();

  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [cards, setCards]           = useState<Card[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [catView, setCatView]       = useState<'grid' | 'list'>('grid');
  const [catModal, setCatModal]     = useState(false);
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailCat, setDetailCat]         = useState<CustomCategory | null>(null);

  const load = useCallback(async () => {
    const [d, cats, c] = await Promise.all([getMonthData(monthKey), getCategories(), getCards()]);
    setExpenses(d.expenses);
    setCategories(cats);
    setCards(c);
  }, [monthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSaveCat = async (cat: CustomCategory) => {
    await saveCategory(cat); setCatModal(false); setEditingCat(null); await load();
  };
  const handleDeleteCat = (cat: CustomCategory) =>
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive',
        onPress: async () => { await deleteCategory(cat.id); await load(); } },
    ]);

  const openDetail = (cat: CustomCategory) => {
    setDetailCat(cat);
    setDetailVisible(true);
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const catRows = categories
    .map(cat => ({ cat, total: expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0) }))
    .filter(r => r.total > 0 || !r.cat.isDefault)
    .sort((a, b) => b.total - a.total);

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, flex: 1 },
    headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    viewToggle: { flexDirection: 'row', backgroundColor: COLORS.card2, borderRadius: 10, padding: 3, gap: 2 },
    viewToggleBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    viewToggleBtnActive: { backgroundColor: COLORS.primary },
    addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
    scroll: { padding: 16, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCell: {
      width: '30.5%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
      backgroundColor: COLORS.card, borderRadius: 18,
      borderWidth: 1.5, borderColor: COLORS.border,
      elevation: 1, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2,
      position: 'relative',
    },
    catCellWarning: { borderColor: COLORS.warning },
    catCellIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    catCellName: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
    catCellAmt: { fontSize: FONT.sm, fontWeight: '800', textAlign: 'center' },
    catCellBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.warning, alignItems: 'center', justifyContent: 'center' },
    catList: { gap: 8 },
    catListRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: COLORS.border },
    catListIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
    catListBody: { flex: 1 },
    catListTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    catListName: { color: COLORS.text, fontSize: FONT.base, fontWeight: '700', flex: 1, marginRight: 8 },
    catListAmt: { fontSize: FONT.base, fontWeight: '800' },
    catListTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
    catListFill: { height: '100%', borderRadius: 2 },
    catListPct: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },
  }, moderateScale)), [COLORS, moderateScale]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorías</Text>
        <View style={styles.headerRight}>
          <View style={styles.viewToggle}>
            <TouchableOpacity onPress={() => setCatView('grid')} style={[styles.viewToggleBtn, catView === 'grid' && styles.viewToggleBtnActive]}>
              <Ionicons name="grid" size={14} color={catView === 'grid' ? '#fff' : COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCatView('list')} style={[styles.viewToggleBtn, catView === 'list' && styles.viewToggleBtnActive]}>
              <Ionicons name="menu" size={14} color={catView === 'list' ? '#fff' : COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setEditingCat(null); setCatModal(true); }} style={styles.addBtn}>
            <Ionicons name="add" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {catRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="apps-outline" size={40} color={COLORS.textDim} />
            <Text style={styles.emptyText}>Sin gastos este mes</Text>
            <Text style={styles.emptyHint}>Toca + para crear una categoría</Text>
          </View>
        ) : catView === 'grid' ? (
          <View style={styles.catGrid}>
            {catRows.map(({ cat, total: catTotal }) => {
              const budget = cat.budget ?? 0;
              const overBudget = budget > 0 && catTotal > budget;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCell, overBudget && styles.catCellWarning]}
                  onPress={() => openDetail(cat)}
                  onLongPress={() =>
                    Alert.alert(cat.name, '', [
                      { text: 'Editar categoría', onPress: () => { setEditingCat(cat); setCatModal(true); } },
                      ...(!cat.isDefault ? [{
                        text: 'Eliminar', style: 'destructive' as const,
                        onPress: () => handleDeleteCat(cat),
                      }] : []),
                      { text: 'Cancelar', style: 'cancel' },
                    ])
                  }
                  activeOpacity={0.75}
                >
                  <View style={[styles.catCellIcon, { backgroundColor: cat.color + '22' }]}>
                    {cat.emoji
                      ? <Text style={{ fontSize: 26 }}>{cat.emoji}</Text>
                      : <Ionicons name={cat.icon as any} size={26} color={cat.color} />}
                  </View>
                  <Text style={styles.catCellName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={[styles.catCellAmt, { color: catTotal > 0 ? cat.color : COLORS.textDim }]}>
                    {catTotal > 0 ? formatCOP(catTotal) : '$0'}
                  </Text>
                  {overBudget && (
                    <View style={styles.catCellBadge}>
                      <Ionicons name="warning" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.catList}>
            {catRows.map(({ cat, total: catTotal }) => {
              const budget = cat.budget ?? 0;
              const overBudget = budget > 0 && catTotal > budget;
              const pct = totalSpent > 0 ? Math.min((catTotal / totalSpent) * 100, 100) : 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catListRow, overBudget && styles.catCellWarning]}
                  onPress={() => openDetail(cat)}
                  onLongPress={() =>
                    Alert.alert(cat.name, '', [
                      { text: 'Editar categoría', onPress: () => { setEditingCat(cat); setCatModal(true); } },
                      ...(!cat.isDefault ? [{
                        text: 'Eliminar', style: 'destructive' as const,
                        onPress: () => handleDeleteCat(cat),
                      }] : []),
                      { text: 'Cancelar', style: 'cancel' },
                    ])
                  }
                  activeOpacity={0.78}
                >
                  <View style={[styles.catListIcon, { backgroundColor: cat.color + '22' }]}>
                    {cat.emoji
                      ? <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                      : <Ionicons name={cat.icon as any} size={20} color={cat.color} />}
                  </View>
                  <View style={styles.catListBody}>
                    <View style={styles.catListTopRow}>
                      <Text style={styles.catListName} numberOfLines={1}>{cat.name}</Text>
                      <Text style={[styles.catListAmt, { color: catTotal > 0 ? cat.color : COLORS.textDim }]}>
                        {catTotal > 0 ? formatCOP(catTotal) : '$0'}
                      </Text>
                    </View>
                    <View style={styles.catListTrack}>
                      <View style={[styles.catListFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                    </View>
                    <Text style={styles.catListPct}>{Math.round(pct)}% del gasto total</Text>
                  </View>
                  {overBudget && (
                    <Ionicons name="warning" size={14} color={COLORS.warning} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <CategoryFormModal
        visible={catModal}
        category={editingCat}
        onSave={handleSaveCat}
        onClose={() => { setCatModal(false); setEditingCat(null); }}
      />

      <CategoryDetailModal
        visible={detailVisible}
        cat={detailCat}
        expenses={expenses.filter(e => detailCat ? e.categoryId === detailCat.id : false)}
        cards={cards}
        categories={categories}
        monthKey={monthKey}
        onRefresh={load}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}
