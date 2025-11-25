import { Ionicons } from '@expo/vector-icons'; // Icon for the add button
import { Link } from 'expo-router';
import { collection, onSnapshot, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/useAuth';
import { db } from '../../firebaseConfig';

interface Note {
  id: string;
  content: string;
  timestamp: number;
}

export default function HomeScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signIn, logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Query ONLY the current user's notes
    const q = query(
      collection(db, 'users', user.uid, 'notes'), 
      orderBy('createdAt', 'desc')
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(notesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]); // Re-run when user changes

  if (!user) {
     return (
       <View style={styles.center}>
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
    <ThemedView style={styles.noteCard}>
      <ThemedText style={styles.noteContent}>{item.content}</ThemedText>
      <ThemedText style={styles.noteDate}>
        {new Date(item.timestamp).toLocaleDateString()}
      </ThemedText>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNote(item.id)}
        accessibilityLabel="Delete note"
      >
        <Ionicons name="trash" size={20} color="#d11a2a" />
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Scrappr</ThemedText>
        <Button title="Logout" onPress={logout} />
      </ThemedView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={notes}
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
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Or use theme background
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  noteCard: {
      deleteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 6,
        backgroundColor: 'transparent',
      },
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9', // Light gray card background
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteContent: {
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  noteDate: {
    fontSize: 12,
    color: '#888',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4', // Scrappr blue or similar
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});