// sharing-utils.js - Utilities for sharing and URL handling

class SharingUtils {
    // Convert JSON to base64 string
    static jsonToBase64(json) {
        try {
            if (typeof json === 'object') {
                json = JSON.stringify(json);
            }
            return btoa(encodeURIComponent(json));
        } catch (error) {
            console.error('Error converting JSON to base64:', error);
            return null;
        }
    }

    // Convert base64 to JSON
    static base64ToJson(base64Str) {
        if (!base64Str) return null;

        try {
            // Decode from base64 and parse as JSON
            return JSON.parse(decodeURIComponent(atob(base64Str)));
        } catch (error) {
            console.error('Error decoding base64 to JSON:', error);
            return null;
        }
    }

    // Generate shareable URL with story data
    static generateShareableUrl(storyData) {
        if (!storyData) return null;

        try {
            // Convert story data to base64
            const storyBase64 = this.jsonToBase64(storyData);
            if (!storyBase64) return null;

            // Create URL
            const url = new URL(window.location.href);
            url.search = ''; // Clear existing query parameters
            url.searchParams.set('story', storyBase64);

            return url.toString();
        } catch (error) {
            console.error('Error generating shareable URL:', error);
            return null;
        }
    }

    // Extract story data from URL
    static extractStoryFromUrl() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const storyParam = urlParams.get('story');

            if (storyParam) {
                return this.base64ToJson(storyParam);
            }
            return null;
        } catch (error) {
            console.error('Error extracting story from URL:', error);
            return null;
        }
    }

    // Generate a compressed version of the story data
    static compressStoryData(storyData) {
        // This could be extended later to implement actual compression
        // or to strip unnecessary data for sharing
        return storyData;
    }

    // Copy text to clipboard (using modern Clipboard API with fallback)
    static async copyToClipboard(text, callback) {
        if (!text) {
            console.error('No text to copy');
            return false;
        }

        try {
            // Try to use modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                if (callback && typeof callback === 'function') {
                    callback();
                }
                return true;
            }

            // Fallback to older method
            const tempInput = document.createElement('textarea');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            const success = document.execCommand('copy');
            document.body.removeChild(tempInput);

            if (callback && typeof callback === 'function') {
                callback();
            }
            return success;
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    }
}