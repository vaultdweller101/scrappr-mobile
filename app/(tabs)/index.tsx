import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { arrayRemove, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LinkText from '@/components/link-text';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { db } from '../../firebaseConfig';

interface Note {
  id: string;
  content: string;
  timestamp: number;
  tags: string[];
}

export default function HomeScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signIn, logout } = useAuth();
  
  // Get current theme
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  const [allUserTags, setAllUserTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'notes'), 
      orderBy('createdAt', 'desc')
    );

    const tagsRef = doc(db, "users", user.uid, "metadata", "tags");
    const unsubscribeTags = onSnapshot(tagsRef, (docSnap) => {
      if (docSnap.exists()) {
        const rawList = docSnap.data().list || []; // Fixed typo here
        const sortedList = rawList.sort((a: string, b: string) => a.localeCompare(b));
        setAllUserTags(sortedList);
      } else {
        setAllUserTags([]);
      }
    });

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesList = snapshot.docs.map(doc => ({
        id: doc.id,
        content: doc.data().content,
        timestamp: doc.data().timestamp || Date.now(),
        tags: doc.data().tagList
      })) as Note[];
      setNotes(notesList);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeTags();
    }
  }, [user]);

  if (!user) {
     return (
       <View style={[styles.center, { backgroundColor: themeColors.background }]}>
         <Button title="Sign in with Google" onPress={signIn} />
       </View>
     );
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <Pressable
      onLongPress={() => {
        router.push({
          pathname: '/modal',
          params: { id: item.id, content: item.content, tags: item.tags},
        });
      }}
      android_ripple={{ color: themeColors.border }}
    >
      <View style={[styles.noteCard, { backgroundColor: themeColors.card }]}>
        <LinkText style={[styles.noteContent, { color: themeColors.text }]} linkStyle={styles.link}>
          {item.content}
        </LinkText>

        <Text style={[styles.noteDate, { color: themeColors.icon }]}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNote(item.id)}
          accessibilityLabel="Delete note"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: themeColors.danger, fontWeight: 'bold', fontSize: 18 }}>×</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );

  const filteredNotes = notes.filter(note => {
    if (filterTags.length === 0) return true;
    if (!note.tags || !Array.isArray(note.tags)) return false;
    return note.tags.some(t => filterTags.includes(t));
  });

  const promptDeleteTag = (tagToDelete: string) => {
    Alert.alert(
      "Delete Tag?",
      `Are you sure you want to delete #${tagToDelete} from ALL notes globally?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              const masterRef = doc(db, "users", user.uid, "metadata", "tags");
              batch.update(masterRef, { list: arrayRemove(tagToDelete) });
              const notesRef = collection(db, "users", user.uid, "notes");
              const q = query(notesRef, where("tagList", "array-contains", tagToDelete));
              const snapshot = await getDocs(q);
              snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { tagList: arrayRemove(tagToDelete) });
              });
              await batch.commit();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Could not delete tag.");
            }
          }
        }
      ]
    );
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags(prevTags => {
      if (prevTags.includes(tag)) {
        return prevTags.filter(t => t !== tag);
      } else {
        return [...prevTags, tag];
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <ThemedText type="title">Scrappr</ThemedText>
        <Button title="Logout" onPress={logout} />
      </View>

      <View style={[styles.filterContainer, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContentContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip, 
              { backgroundColor: themeColors.filterChip, borderColor: themeColors.border },
              filterTags.length === 0 && { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint }
            ]}
            onPress={() => setFilterTags([])}
          >
            <Text style={[
              styles.filterText, 
              { color: themeColors.text },
              filterTags.length === 0 && styles.activeFilterText
            ]}>
              All Notes
            </Text>
          </TouchableOpacity>

          {allUserTags.map(tag => {
            const isActive = filterTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterChip, 
                  { backgroundColor: themeColors.filterChip, borderColor: themeColors.border },
                  isActive && { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint }
                ]}
                onPress={() => toggleFilterTag(tag)}
                onLongPress={() => promptDeleteTag(tag)}
                delayLongPress={500}
              >
                <Text style={[
                  styles.filterText, 
                  { color: themeColors.text },
                  isActive && styles.activeFilterText
                ]}>
                  #{tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText>No notes yet. Add one!</ThemedText>
            </View>
          }
        />
      )}
      <Link href="/modal" asChild>
        <TouchableOpacity style={[styles.fab, { backgroundColor: Colors.light.tint }]}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, 
  },
  noteCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    position: 'relative',
  },
  noteContent: {
    fontSize: 16,
    marginBottom: 8,
  },
  link: {
    color: '#0a7ea4', 
    textDecorationLine: 'underline',
  },
  noteDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    height: 50,
    borderBottomWidth: 1,
  },
  filterContentContainer: {
    paddingHorizontal: 15,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
});