import { xhrImpl } from './xhr';
import { fetchImpl } from './fetch';

export function getBoundary(contentType = '') {
    const contentTypeParts = contentType.split(';');
    for (const contentTypePart of contentTypeParts) {
        const [key, value] = (contentTypePart || '').trim().split('=');
        if (key === 'boundary' && !!value) {
            if (value[0] === '"' && value[value.length - 1] === '"') {
                return value.substr(1, value.length - 2);
            }
            return value;
        }
    }
    return '-';
}
