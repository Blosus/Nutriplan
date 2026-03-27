import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DietDailyHistoryItem } from '@/services/diet-daily';

type Props = {
  items: DietDailyHistoryItem[];
  recommendedCalories: number;
  colors?: any;
};

const weekdayShort = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const formatDay = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  return weekdayShort[d.getDay()];
};

export default function CalorieChart({ items, recommendedCalories, colors }: Props) {
  const maxRatio = Math.max(
    1,
    ...items.map(i => (recommendedCalories > 0 ? i.caloriesConsumed / recommendedCalories : 0))
  );

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        {items.map((it) => {
          const ratio = recommendedCalories > 0 ? it.caloriesConsumed / recommendedCalories : 0;
          const heightPercent = Math.max(6, (ratio / maxRatio) * 100);
          const barColor = it.goalMet ? (colors?.accent ?? '#4CAF50') : (colors?.textSecondary ?? '#BDBDBD');

          return (
            <View key={it.dateKey} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: `${heightPercent}%`, backgroundColor: barColor },
                  ]}
                />
              </View>

              <Text style={[styles.barLabel, { color: colors?.text ?? '#222' }]}>{formatDay(it.dateKey)}</Text>
              <Text style={[styles.barSmall, { color: colors?.textSecondary ?? '#666' }]}>{it.caloriesConsumed} kcal</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: colors?.textSecondary ?? '#666' }]}>Referencia: {recommendedCalories} kcal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  barWrapper: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '72%',
    borderRadius: 6,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 12,
  },
  barSmall: {
    fontSize: 11,
    marginTop: 2,
  },
  legendRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  legendText: {
    fontSize: 12,
  },
});
