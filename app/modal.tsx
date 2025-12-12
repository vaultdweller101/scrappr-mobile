import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db, functions } from '../firebaseConfig';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ModalScreen() {
  const params = useLocalSearchParams<{ id: string; content: string; tags: string[] }>();
  
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Audio Recording States
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const { user } = useAuth();

  // Theme
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  useEffect(() => {
    if (params.content) {
      setNote(params.content);
    }
    let loadedTags: any = params.tags;
    let cleanTags: string[] = [];
    if (typeof loadedTags === 'string') {
      if (loadedTags.trim() === "") {
        cleanTags = [];
      } else {
        cleanTags = loadedTags.includes(',') 
          ? loadedTags.split(',').map(t => t.trim()) 
          : [loadedTags];
      }
    }
    else if (!Array.isArray(loadedTags)) {
      cleanTags = [];
    } else {
      cleanTags = loadedTags;
    }
    setTags(cleanTags);
  }, [params.content, params.tags]);

  // Audio Recording Functions
  async function startRecording() {
    try {
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
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const transcribeFunction = httpsCallable<{ audioBase64: string }, { text: string }>(
        functions, 
        'transcribeAudio'
      );

      const response = await transcribeFunction({ audioBase64: base64Audio });
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
      const cleanTags = tags.filter(tag => tag && tag.trim().length > 0);
      if (params.id) {
        const noteRef = doc(db, 'users', user.uid, 'notes', params.id);
        await updateDoc(noteRef, {
          content: note,
          timestamp: Date.now(),
          tagList: cleanTags, 
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'notes'), { 
          content: note,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          tagList: cleanTags,
        });
      }

      if (cleanTags.length > 0) {
          const masterTagsRef = doc(db, "users", user.uid, "metadata", "tags");
          await setDoc(masterTagsRef, {
            list: arrayUnion(...cleanTags)
          }, { merge: true });
      }
      
      setNote('');
      setTags([]);
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

  const handleAddTag = () => {
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag.length > 0 && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Top Controls (Replaces Title) */}
        <View style={styles.topControls}>
          <Button 
            title="Cancel" 
            color={colorScheme === 'dark' ? '#ff4d4d' : 'gray'}
            onPress={() => router.dismiss()} 
          />
          
          <TouchableOpacity 
            style={[styles.recordButtonCompact, isRecording && styles.recordingActive]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
          >
             {isTranscribing ? (
                <ActivityIndicator size="small" color="white" />
             ) : (
                <Ionicons 
                  name={isRecording ? "stop" : "mic"} 
                  size={20} 
                  color="white" 
                />
             )}
          </TouchableOpacity>

          <Button 
            title={isSaving ? "Saving..." : (isEditing ? "Update" : "Save")} 
            onPress={saveNote} 
            disabled={!note.trim() || isSaving || isRecording || isTranscribing} 
          />
        </View>
        
        <TextInput 
          style={[
            styles.input, 
            { backgroundColor: themeColors.input, color: themeColors.text }
          ]} 
          placeholder="What's on your mind?" 
          placeholderTextColor={themeColors.icon}
          value={note}
          onChangeText={setNote}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <View style={[styles.tagSection, { borderBottomColor: themeColors.border }]}>
          <View style={styles.tagContainer}>
            {tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={[styles.tagChip, { backgroundColor: themeColors.filterChip }]}>
                <ThemedText style={styles.tagText}>#{tag}</ThemedText>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Ionicons name="close-circle" size={16} color={themeColors.icon} style={{marginLeft: 4}} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={[
            styles.tagInputWrapper, 
            { 
              backgroundColor: themeColors.background, 
              borderColor: themeColors.border 
            }
          ]}>
            <Ionicons name="pricetag-outline" size={20} color={themeColors.icon} style={{marginRight: 8}} />
            <TextInput
              style={[styles.tagInput, { color: themeColors.text }]}
              placeholder="Add tag..."
              placeholderTextColor={themeColors.icon}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag} 
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false} 
            />
          </View>
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
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
  },
  input: {
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
  },
  recordButtonCompact: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#FF3B30',
  },
  tagSection: {
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  tagInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
});