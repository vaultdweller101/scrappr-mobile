// app/modal.tsx

import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons'; // Import Icons
import { Audio } from 'expo-av'; // Import Audio
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db, functions } from '../firebaseConfig';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const params = useLocalSearchParams<{ id: string; content: string }>();
  
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Audio Recording States
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (params.content) {
      setNote(params.content);
    }
  }, [params.content]);

  // Audio Recording Functions

  async function startRecording() {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission to record notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); 
      
      // Reset recording object
      setRecording(null);

      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Error stopping recording', error);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function transcribeAudio(uri: string) {
    try {
      setIsTranscribing(true);

      // 1. Read the audio file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // 2. Call the Cloud Function
      const transcribeFunction = httpsCallable<{ audioBase64: string }, { text: string }>(
        functions, 
        'transcribeAudio'
      );

      const response = await transcribeFunction({ audioBase64: base64Audio });
      
      // 3. Use the result
      const text = response.data.text;
      
      setNote((prev) => (prev ? `${prev} ${text}` : text));

    } catch (error: any) {
      console.error('Transcription failed:', error);
      Alert.alert('Debug Error', error.message || JSON.stringify(error)); 
      setIsTranscribing(false);
    }
  }

  // Saving logic

  const saveNote = async () => {
    if (!note.trim() || !user) return;

    setIsSaving(true);
    try {
      if (params.id) {
        const noteRef = doc(db, 'users', user.uid, 'notes', params.id);
        await updateDoc(noteRef, {
          content: note,
          timestamp: Date.now(), 
        });
      } else {
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

        {/* Recording UI */}
        <View style={styles.recordingContainer}>
          {isTranscribing ? (
            <View style={styles.transcribingRow}>
              <ActivityIndicator size="small" color="#007AFF" />
              <ThemedText style={{ marginLeft: 8 }}>Transcribing...</ThemedText>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordingActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={24} 
                color="white" 
              />
              <ThemedText style={styles.recordButtonText}>
                {isRecording ? "Stop Recording" : "Record Audio"}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonGroup}>
          <Button 
            title={isSaving ? "Saving..." : (isEditing ? "Update Note" : "Save Note")} 
            onPress={saveNote} 
            disabled={!note.trim() || isSaving || isRecording || isTranscribing} 
          />
          
          <Button 
            title="Cancel" 
            color="gray"
            onPress={() => router.dismiss()} 
          />
        </View>
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
  recordingContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  recordingActive: {
    backgroundColor: '#FF3B30', // Red when recording
  },
  recordButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  transcribingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44, // Match button height roughly to prevent layout jump
  },
  buttonGroup: {
    gap: 10,
  },
});