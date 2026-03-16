import { useTheme } from "@/hooks/theme-context";
import { Alarm, loadUserAlarms, saveUserAlarms } from "@/services/alarms";
import { getCurrentSessionUser } from "@/services/session";
import { Feather, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { LineChart, ProgressChart } from "react-native-chart-kit";
import { getIndexStyles, screenWidth } from '../styles/index.styles';

type DietProgress = {
  calories: {
    target: number;
    consumed: number;
  };
  water: {
    target: number;
    consumed: number;
  };
  meals: {
    total: number;
    completed: number;
  };
  streak: number;
  lastUpdated: string;
};

export default function HomeScreen() {
  const { colors, theme } = useTheme();
  const styles = getIndexStyles(colors);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [ownerUid, setOwnerUid] = useState("guest");
  const [activeTab, setActiveTab] = useState<'alarms' | 'diet'>('alarms');
  const [dietProgress, setDietProgress] = useState<DietProgress>({
    calories: {
      target: 2000,
      consumed: 1450
    },
    water: {
      target: 2000,
      consumed: 1200
    },
    meals: {
      total: 4,
      completed: 3
    },
    streak: 7,
    lastUpdated: new Date().toLocaleDateString('es-ES')
  });

  const loadAlarms = async () => {
    const sessionUser = await getCurrentSessionUser();
    const uid = sessionUser?.uid ?? "guest";
    setOwnerUid(uid);

    const loaded = await loadUserAlarms(uid);
    setAlarms(loaded);
  };

  useFocusEffect(() => {
    loadAlarms();
  });

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      })
    });

    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('alarm-channel', {
          name: 'Alarm Channel',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#FF0000',
        });
      } catch (e) {
        // ignore if not Android or not supported
      }
    })();

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const alarmId = response.notification.request.content.data?.alarmId;
      if (alarmId) {
        router.push(`/alarmScreen?id=${alarmId}`);
      }
    });

    const receivedListener = Notifications.addNotificationReceivedListener(notification => {
      const alarmId = notification.request.content.data?.alarmId;
      if (alarmId) {
        router.push(`/alarmScreen?id=${alarmId}`);
      }
    });

    return () => {
      responseListener.remove();
      receivedListener.remove();
    };
  }, []);

  const toggleAlarm = async (alarm: Alarm) => {
    let updatedAlarm = { ...alarm, enabled: !alarm.enabled };

    if (updatedAlarm.enabled) {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: updatedAlarm.name || "Alarma",
          body: updatedAlarm.description || "¡Es hora!",
          sound: true,
          data: { alarmId: updatedAlarm.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: updatedAlarm.hour,
          minute: updatedAlarm.minute,
        },
      });
      updatedAlarm.notifId = notifId;
    } else {
      if (updatedAlarm.notifId) {
        await Notifications.cancelScheduledNotificationAsync(updatedAlarm.notifId);
        updatedAlarm.notifId = undefined;
      }
    }

    const updatedAlarms = alarms.map(a => a.id === alarm.id ? updatedAlarm : a);
    setAlarms(updatedAlarms);
    await saveUserAlarms(ownerUid, updatedAlarms);
  };

  const removeAlarm = async (alarm: Alarm) => {
    if (alarm.notifId) {
      await Notifications.cancelScheduledNotificationAsync(alarm.notifId);
    }
    const next = alarms.filter((a) => a.id !== alarm.id);
    setAlarms(next);
    await saveUserAlarms(ownerUid, next);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
  };

  const getTotalAlarms = () => alarms.length;
  const getActiveAlarms = () => alarms.filter(a => a.enabled).length;

  const handleUpdateDiet = (type: 'calories' | 'water' | 'meal', value: number) => {
    setDietProgress(prev => {
      const newProgress = { ...prev };
      if (type === 'calories') {
        newProgress.calories.consumed = Math.max(0, Math.min(newProgress.calories.target, value));
      } else if (type === 'water') {
        newProgress.water.consumed = Math.max(0, Math.min(newProgress.water.target, value));
      } else if (type === 'meal') {
        newProgress.meals.completed = Math.max(0, Math.min(newProgress.meals.total, value));
      }
      newProgress.lastUpdated = new Date().toLocaleDateString('es-ES');
      return newProgress;
    });
  };

  const getCaloriePercentage = () => dietProgress.calories.consumed / dietProgress.calories.target;
  const getWaterPercentage = () => dietProgress.water.consumed / dietProgress.water.target;
  const getMealsPercentage = () => dietProgress.meals.completed / dietProgress.meals.total;

  const calorieData = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [{
      data: [1800, 1950, 1650, 2100, 1750, 1900, dietProgress.calories.consumed],
      color: (opacity = 1) => `rgba(255, 213, 79, ${opacity})`,
      strokeWidth: 3
    }]
  };

  const progressData = {
    labels: ["Calorías", "Agua", "Comidas"],
    data: [getCaloriePercentage(), getWaterPercentage(), getMealsPercentage()]
  };

  const renderDietTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dietContent}>
      {/* Header Dieta */}
      <View style={styles.dietHeader}>
        <View style={styles.dietHeaderTitle}>
          <FontAwesome5 name="apple-alt" size={24} color={theme === 'dark' ? colors.accent : colors.text} />
          <Text style={styles.dietHeaderText}>Mi Progreso Dietético</Text>
        </View>
        <Text style={styles.dietDate}>Actualizado: {dietProgress.lastUpdated}</Text>
      </View>

      {/* Tarjeta de Racha */}
      <View style={styles.streakCard}>
        <View style={styles.streakInfo}>
          <View style={styles.streakIcon}>
            <FontAwesome5 name="fire" size={24} color={theme === 'dark' ? colors.accent : colors.text} />
          </View>
          <View>
            <Text style={styles.streakLabel}>Racha Actual</Text>
            <Text style={styles.streakValue}>{dietProgress.streak} días</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Feather name="edit-2" size={18} color="#FFF8E1" />
        </TouchableOpacity>
      </View>

      {/* Gráfico de Progreso Circular */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Progreso del Día</Text>
        <View style={styles.progressChartContainer}>
          <ProgressChart
            data={progressData}
            width={screenWidth - 80}
            height={180}
            strokeWidth={12}
            radius={40}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1, index) => {
                const chartColors = [
                  `rgba(255, 213, 79, ${opacity})`,
                  `rgba(66, 165, 245, ${opacity})`,
                  `rgba(102, 187, 106, ${opacity})`
                ];
                return chartColors[index ?? 0];
              },
              labelColor: () => colors.text,
              style: {
                borderRadius: 16
              }
            }}
            hideLegend={false}
            style={styles.progressChart}
          />
        </View>
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: theme === 'dark' ? colors.accent : colors.text }]} />
            <Text style={styles.statLabel}>Calorías</Text>
            <Text style={styles.statValue}>
              {dietProgress.calories.consumed}/{dietProgress.calories.target} kcal
            </Text>
          </View>
          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#42A5F5" }]} />
            <Text style={styles.statLabel}>Agua</Text>
            <Text style={styles.statValue}>
              {dietProgress.water.consumed}/{dietProgress.water.target} ml
            </Text>
          </View>
          <View style={styles.progressStat}>
            <View style={[styles.statDot, { backgroundColor: "#66BB6A" }]} />
            <Text style={styles.statLabel}>Comidas</Text>
            <Text style={styles.statValue}>
              {dietProgress.meals.completed}/{dietProgress.meals.total}
            </Text>
          </View>
        </View>
      </View>

      {/* Controles Rápidos */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Actualizar Progreso</Text>
        <View style={styles.quickControls}>
          <View style={styles.quickControl}>
            <Text style={styles.controlLabel}>Calorías</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('calories', dietProgress.calories.consumed - 100)}
              >
                <Text style={styles.controlButtonText}>-100</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('calories', dietProgress.calories.consumed + 100)}
              >
                <Text style={styles.controlButtonText}>+100</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.quickControl}>
            <Text style={styles.controlLabel}>Agua (ml)</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('water', dietProgress.water.consumed - 250)}
              >
                <Text style={styles.controlButtonText}>-250</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('water', dietProgress.water.consumed + 250)}
              >
                <Text style={styles.controlButtonText}>+250</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.quickControl}>
            <Text style={styles.controlLabel}>Comidas</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('meal', dietProgress.meals.completed - 1)}
              >
                <Text style={styles.controlButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => handleUpdateDiet('meal', dietProgress.meals.completed + 1)}
              >
                <Text style={styles.controlButtonText}>+1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Ver Detalles Completos</Text>
          <Ionicons name="arrow-forward" size={18} color={theme === 'dark' ? colors.accent : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Gráfico de Línea - Semanal */}
      <View style={styles.sectionCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Calorías Consumidas</Text>
          <Text style={styles.chartSubtitle}>Últimos 7 días</Text>
        </View>
        <LineChart
          data={calorieData}
          width={screenWidth - 80}
          height={200}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 213, 79, ${opacity})`,
            labelColor: () => colors.text,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: colors.surface
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: colors.border,
              strokeWidth: 1
            }
          }}
          bezier
          style={styles.lineChart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={false}
        />
        <View style={styles.chartStats}>
          <Text style={styles.chartStat}>
            <Text style={styles.chartStatLabel}>Promedio: </Text>
            <Text style={styles.chartStatValue}>1850 kcal</Text>
          </Text>
          <Text style={styles.chartStat}>
            <Text style={styles.chartStatLabel}>Objetivo: </Text>
            <Text style={styles.chartStatValue}>{dietProgress.calories.target} kcal</Text>
          </Text>
        </View>
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipIcon}>
          <Ionicons name="bulb-outline" size={24} color={theme === 'dark' ? colors.accent : colors.text} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Consejo del Día</Text>
          <Text style={styles.tipText}>
            Bebe un vaso de agua 30 minutos antes de cada comida para mejorar la digestión y controlar el apetito.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/ajustes")}>
          <Ionicons name="cog" size={24} color={colors.accent} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {activeTab === 'alarms' ? 'Mis Alarmas' : 'Mi Progreso'}
          </Text>
          <Text style={styles.stepIndicator}>
            {activeTab === 'alarms' ? `${getTotalAlarms()} alarmas` : 'Hoy'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => activeTab === 'alarms' ? router.push("/(tabs)/newAlarm") : null}
        >
          <Ionicons name={activeTab === 'alarms' ? "add-circle" : "refresh"} size={32} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tabs de Navegación */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alarms' && styles.activeTab]} 
          onPress={() => setActiveTab('alarms')}
        >
          <Ionicons 
            name="alarm" 
            size={20} 
            color={activeTab === 'alarms' ? "#121212" : colors.text} 
          />
          <Text style={[styles.tabText, activeTab === 'alarms' && styles.activeTabText]}>
            Alarmas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'diet' && styles.activeTab]} 
          onPress={() => setActiveTab('diet')}
        >
          <Ionicons 
            name="restaurant" 
            size={20} 
            color={activeTab === 'diet' ? "#121212" : colors.text} 
          />
          <Text style={[styles.tabText, activeTab === 'diet' && styles.activeTabText]}>
            Dieta
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido basado en la pestaña activa */}
      {activeTab === 'alarms' ? (
        <>
          {/* Resumen de Alarmas */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, styles.summaryIconActive]}>
                <MaterialIcons name="alarm" size={20} color="#121212" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Activas</Text>
                <Text style={styles.summaryValue}>{getActiveAlarms()}</Text>
              </View>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, styles.summaryIconTotal]}>
                <MaterialIcons name="list" size={20} color="#121212" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{getTotalAlarms()}</Text>
              </View>
            </View>
          </View>

          {/* Lista de Alarmas o Empty State */}
          {alarms.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="alarm-outline" size={60} color={theme === 'dark' ? colors.accent : colors.text} />
              </View>
              <Text style={styles.emptyStateTitle}>No hay alarmas</Text>
              <Text style={styles.emptyStateText}>
                Presiona el botón + para crear tu primera alarma
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push("/(tabs)/newAlarm")}
              >
                <Text style={styles.emptyStateButtonText}>Crear Alarma</Text>
                <Ionicons name="arrow-forward" size={18} color="#121212" />
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={alarms}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[
                  styles.alarmCard,
                  item.enabled ? styles.alarmCardActive : styles.alarmCardInactive
                ]}>
                  {/* Time Section */}
                  <View style={styles.alarmTimeContainer}>
                    <View style={styles.alarmTimeHeader}>
                      <Text style={[
                        styles.alarmTime,
                        item.enabled ? styles.alarmTimeActive : styles.alarmTimeInactive
                      ]}>
                        {formatTime(item.hour, item.minute)}
                      </Text>
                      <View style={[
                        styles.alarmStatus,
                        item.enabled ? styles.alarmStatusActive : styles.alarmStatusInactive
                      ]}>
                        <Text style={styles.alarmStatusText}>
                          {item.enabled ? 'ACTIVA' : 'INACTIVA'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.alarmDetails}>
                      <Text style={styles.alarmName}>{item.name}</Text>
                      {item.description.length > 0 && (
                        <View style={styles.descriptionContainer}>
                          <Ionicons name="document-text-outline" size={14} color="#888888" />
                          <Text style={styles.alarmDescription}>{item.description}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Controles */}
                  <View style={styles.alarmControls}>
                    <View style={styles.switchContainer}>
                      <Text style={styles.switchLabel}>
                        {item.enabled ? 'Encendida' : 'Apagada'}
                      </Text>
                      <Switch
                        value={item.enabled}
                        onValueChange={() => toggleAlarm(item)}
                        trackColor={{ false: "#333333", true: "#4CAF50" }}
                        thumbColor={item.enabled ? "#FFD54F" : "#FFFFFF"}
                        ios_backgroundColor="#333333"
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.editAlarmButton}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/editAlarma",
                          params: { id: String(item.id) },
                        })
                      }
                    >
                      <Feather name="edit-2" size={18} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert('Eliminar alarma', '¿Deseas eliminar esta alarma?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => removeAlarm(item) }
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </>
      ) : (
        renderDietTab()
      )}
    </View>
  );
}