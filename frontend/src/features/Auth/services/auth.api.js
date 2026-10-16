import axios from 'axios';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    withCredentials: true,
});

export async function register({username, email, password}) {
    try {
        const response = await api.post('/api/auth/register', { username, email, password });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
}

export async function login({email, username, password}) {
    try {
        const response = await api.post('/api/auth/login', { email, username, password });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
}

export async function getme() {
    try {
        const response = await api.get('/api/auth/get-me');
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
}

export async function logout() {
    try {
        const response = await api.get('/api/auth/logout') 
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
}