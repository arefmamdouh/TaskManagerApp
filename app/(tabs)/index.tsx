import { useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// task type - added priority and category later on
type Priority = 'high' | 'medium' | 'low';

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  time?: string; // optional, not everyone wants to set a time
  category: string;
};

// keeping these outside the component so they dont re-render every time
const CATEGORIES = ['All', 'Work', 'Personal', 'Health', 'Other'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

// colors for each priority level
const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#FF6B6B',
  medium: '#FFB347',
  low: '#6BCB77',
};

// each category gets its own color for the badge
const CATEGORY_COLORS: Record<string, string> = {
  Work: '#4D96FF',
  Personal: '#FF6B9D',
  Health: '#6BCB77',
  Other: '#C77DFF',
};

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);

  // modal state + form fields
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [selectedCategory, setSelectedCategory] = useState('Work');
  const [time, setTime] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // this controls how far down the sheet has been dragged
  const translateY = useRef(new Animated.Value(0)).current;

  // slides the sheet down then hides the modal
  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      setModalVisible(false);
    });
  };

  // start it off screen then slide up
  const openModal = () => {
    translateY.setValue(600);
    setModalVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // handles the swipe down gesture on the sheet
  // if dragged far enough or fast enough, close it, otherwise snap back
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 8 && Math.abs(g.dx) < Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.5) {
          closeModal();
        } else {
          // snap back if they didn't drag far enough
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // just getting today's date for the header
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const addTask = () => {
    // dont add if title is empty
    if (!title.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(), // using timestamp as id, good enough
      title,
      description,
      completed: false,
      priority: selectedPriority,
      category: selectedCategory,
      time: time || undefined,
    };
    setTasks([...tasks, newTask]);
    // reset the form
    setTitle('');
    setDescription('');
    setTime('');
    setSelectedPriority('medium');
    setSelectedCategory('Work');
    closeModal();
  };

  // toggles between completed and active
  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // filter tasks by the selected category tab
  const filteredTasks =
    activeFilter === 'All'
      ? tasks
      : tasks.filter(t => t.category === activeFilter);

  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);

  // percentage of all tasks (not just filtered) that are done
  const completionRate =
    tasks.length > 0
      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* header - shows date, title and completion ring */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{dateStr}</Text>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSubtitle}>
            {activeTasks.length} remaining · {completionRate}% done
          </Text>
        </View>
        <View style={styles.progressRing}>
          <Text style={styles.progressText}>{completionRate}%</Text>
        </View>
      </View>

      {/* thin bar showing overall progress */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${completionRate}%` as any }]} />
      </View>

      {/* horizontal scrollable filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterTab, activeFilter === cat && styles.filterTabActive]}
            onPress={() => setActiveFilter(cat)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === cat && styles.filterTabTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* main task list */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>

        {/* only show active section if there are active tasks */}
        {activeTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active</Text>
            {activeTasks.map(item => (
              <View key={item.id} style={styles.taskCard}>
                {/* colored bar on the left based on priority */}
                <View
                  style={[
                    styles.priorityBar,
                    { backgroundColor: PRIORITY_COLORS[item.priority] },
                  ]}
                />
                <View style={styles.taskContent}>
                  <View style={styles.taskTopRow}>
                    {/* category badge with a faded background of its color */}
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: CATEGORY_COLORS[item.category] + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: CATEGORY_COLORS[item.category] },
                        ]}
                      >
                        {item.category}
                      </Text>
                    </View>
                    {item.time ? (
                      <Text style={styles.taskTime}>{item.time}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.taskDesc}>{item.description}</Text>
                  ) : null}
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => toggleTask(item.id)}
                    >
                      <Text style={styles.doneBtnText}>✓ Mark done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTask(item.id)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* completed tasks go down here, slightly faded out */}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Completed</Text>
            {completedTasks.map(item => (
              <View key={item.id} style={[styles.taskCard, styles.taskCardDone]}>
                <View style={[styles.priorityBar, { backgroundColor: '#ccc' }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitleDone}>{item.title}</Text>
                  <View style={styles.taskActions}>
                    {/* undo button in case they marked something done by mistake */}
                    <TouchableOpacity
                      style={styles.undoBtn}
                      onPress={() => toggleTask(item.id)}
                    >
                      <Text style={styles.undoBtnText}>↺ Undo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTask(item.id)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* show this if there are no tasks at all (or none in the filtered category) */}
        {filteredTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyText}>No tasks here yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first task</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* floating add button, bottom right */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* add task bottom sheet */}
      <Modal visible={modalVisible} animationType="none" transparent statusBarTranslucent>
        {/* tapping the dark overlay closes the modal */}
        <TouchableOpacity style={styles.modalOverlay} onPress={closeModal} activeOpacity={1} />

        {/* the sheet itself - panResponder lets us swipe it down */}
        <Animated.View
          style={[styles.modalSheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* little handle at the top so users know they can swipe */}
          <View style={styles.modalHandle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View>
              <Text style={styles.modalTitle}>New Task</Text>

              <TextInput
                placeholder="Task title *"
                placeholderTextColor="#aaa"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={false}
              />

              <TextInput
                placeholder="Description (optional)"
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, { height: 80 }]}
                multiline
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <TextInput
                placeholder="Time (e.g. 09:00 AM)"
                placeholderTextColor="#aaa"
                value={time}
                onChangeText={setTime}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* priority selector */}
              <Text style={styles.modalLabel}>Priority</Text>
              <View style={styles.optionRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionChip,
                      { borderColor: PRIORITY_COLORS[p] },
                      selectedPriority === p && {
                        backgroundColor: PRIORITY_COLORS[p],
                      },
                    ]}
                    onPress={() => setSelectedPriority(p)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: selectedPriority === p ? '#fff' : PRIORITY_COLORS[p] },
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* category selector */}
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.optionRow}>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.optionChip,
                      { borderColor: CATEGORY_COLORS[c] },
                      selectedCategory === c && {
                        backgroundColor: CATEGORY_COLORS[c],
                      },
                    ]}
                    onPress={() => setSelectedCategory(c)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: selectedCategory === c ? '#fff' : CATEGORY_COLORS[c] },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={addTask}>
                <Text style={styles.addBtnText}>Add Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeModal}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },

  // header styles
  header: {
    backgroundColor: '#1A73E8',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerDate: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // the thin progress bar under the header
  progressBarBg: {
    height: 4,
    backgroundColor: '#DCE8FF',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#1A73E8',
    borderRadius: 2,
  },

  // filter tabs
  filterScroll: { marginTop: 16, maxHeight: 48 },
  filterContainer: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  filterTabActive: {
    backgroundColor: '#1A73E8',
    borderColor: '#1A73E8',
  },
  filterTabText: { color: '#888', fontWeight: '600', fontSize: 13 },
  filterTabTextActive: { color: '#fff' },

  // task list
  listContainer: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // each task card
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  taskCardDone: { opacity: 0.6 }, // fade completed cards a bit
  priorityBar: { width: 4 },
  taskContent: { flex: 1, padding: 14 },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '700' },
  taskTime: { color: '#aaa', fontSize: 12 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  taskTitleDone: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 8,
  },
  taskDesc: { fontSize: 13, color: '#888', marginBottom: 10 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  doneBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doneBtnText: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
  undoBtn: {
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  undoBtnText: { color: '#666', fontWeight: '700', fontSize: 12 },
  deleteBtn: { color: '#FF6B6B', fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  // empty state when there are no tasks
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptySubText: { color: '#aaa', marginTop: 4 },

  // the + button fixed to the bottom right
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    backgroundColor: '#1A73E8',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36, textAlign: 'center' },

  // modal / bottom sheet
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#888', marginTop: 12, marginBottom: 8, letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8EEFF',
    backgroundColor: '#F8F9FF',
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    fontSize: 15,
    color: '#1a1a2e',
  },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  optionChipText: { fontWeight: '700', fontSize: 13 },
  addBtn: {
    backgroundColor: '#1A73E8',
    padding: 16,
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { alignItems: 'center', marginTop: 12 },
  cancelBtnText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
});