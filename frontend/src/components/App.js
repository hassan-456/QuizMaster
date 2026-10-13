import '../styles/App.css';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Main from './Main';
import Quiz from './Quiz';
import Result from './Result';
import { CheckUserExist } from '../helper/helper';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Main />
    },
    {
        path: '/quiz',
        element: <CheckUserExist><Quiz /></CheckUserExist>
    },
    {
        path: '/result',
        element: <CheckUserExist><Result /></CheckUserExist>
    },
    {
        path: '*',
        element: <Navigate to="/" replace />
    }
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
