// sharing-utils.js - Utilities for sharing and URL handling

class SharingUtils {
    // Convert JSON to base64 string
    static jsonToBase64(json) {
        if (typeof json === 'object') {
            json = JSON.stringify(json);
        }
        return btoa(encodeURIComponent(json));
    }

    // Convert base64 to JSON
    static base64ToJson(base64Str) {
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

        // Convert story data to base64
        const storyBase64 = this.jsonToBase64(storyData);

        // Create URL
        const url = new URL(window.location.href);
        url.search = ''; // Clear existing query parameters
        url.searchParams.set('story', storyBase64);

        return url.toString();
    }

    // Extract story data from URL
    static extractStoryFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const storyParam = urlParams.get('story');

        if (storyParam) {
            try {
                return this.base64ToJson(storyParam);
            } catch (error) {
                console.error('Error extracting story from URL:', error);
                return null;
            }
        }
        return null;
    }

    // Copy text to clipboard
    static copyToClipboard(text, callback) {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        if (callback && typeof callback === 'function') {
            callback();
        }
    }
}