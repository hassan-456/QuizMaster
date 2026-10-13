import { postServerData } from '../helper/helper';

export function publishResult(payload) {
    return postServerData('/api/result', payload);
}
