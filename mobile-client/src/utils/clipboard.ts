// Simple clipboard utility - in a real app you'd use expo-clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // For now, just log the text. In a real app, you'd use expo-clipboard
    console.log('Copied to clipboard:', text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const getClipboardContent = async (): Promise<string> => {
  try {
    // For now, return empty string. In a real app, you'd use expo-clipboard
    return '';
  } catch (error) {
    console.error('Failed to get clipboard content:', error);
    return '';
  }
}; 