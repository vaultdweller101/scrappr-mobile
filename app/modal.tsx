import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const saveNote = async () => {
    if (!note.trim() || !user) return; // User must be logged in to save notes

    setIsSaving(true);
    try {
      // Save to: users -> [USER_ID] -> notes -> [NOTE_ID]
      await addDoc(collection(db, 'users', user.uid, 'notes'), { 
      content: note,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });
      
      setNote('');
      // Close the modal
      if (router.canDismiss()) {
        router.dismiss();
      }
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ThemedText type="title" style={styles.title}>New Idea</ThemedText>
        
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
          title={isSaving ? "Saving..." : "Save Note"} 
          onPress={saveNote} 
          disabled={!note.trim() || isSaving} 
        />
        
        {/* Cancel button */}
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