import { useAuth } from '@/hooks/useAuth';
import { router, useLocalSearchParams } from 'expo-router'; // Import search params
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'; // Import updateDoc and doc
import { useEffect, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  // Retrieve params passed from the list
  const params = useLocalSearchParams<{ id: string; content: string }>();
  
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // If params exist (Edit Mode), pre-fill the state
  useEffect(() => {
    if (params.content) {
      setNote(params.content);
    }
  }, [params.content]);

  const saveNote = async () => {
    if (!note.trim() || !user) return;

    setIsSaving(true);
    try {
      if (params.id) {
        // --- EDIT MODE: Update existing doc ---
        const noteRef = doc(db, 'users', user.uid, 'notes', params.id);
        await updateDoc(noteRef, {
          content: note,
          // We usually update a 'updatedAt' field, but keeping it simple:
          timestamp: Date.now(), 
        });
      } else {
        // --- CREATE MODE: Add new doc ---
        await addDoc(collection(db, 'users', user.uid, 'notes'), { 
          content: note,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
        });
      }
      
      setNote('');
      if (router.canDismiss()) {
        router.dismiss();
      }
    } catch (error) {
      console.error("Error saving document: ", error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isEditing = !!params.id;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Change title based on mode */}
        <ThemedText type="title" style={styles.title}>
          {isEditing ? "Edit Note" : "New Idea"}
        </ThemedText>
        
        <TextInput 
          style={styles.input} 
          placeholder="What's on your mind?" 
          placeholderTextColor="#888"
          value={note}
          onChangeText={setNote}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <Button 
          title={isSaving ? "Saving..." : (isEditing ? "Update Note" : "Save Note")} 
          onPress={saveNote} 
          disabled={!note.trim() || isSaving} 
        />
        
        <Button 
          title="Cancel" 
          color="gray"
          onPress={() => router.dismiss()} 
        />
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
    color: '#000',
  },
});