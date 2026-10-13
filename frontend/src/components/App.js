import '../styles/App.css';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import Main from './Main';
import Quiz from './Quiz';
import Result from './Result';
import AdminLogin from './admin/AdminLogin';
import AdminTests from './admin/AdminTests';
import TestEditor from './admin/TestEditor';
import AdminResults from './admin/AdminResults';
import RequireAdmin from './admin/RequireAdmin';
import { CheckUserExist } from '../helper/helper';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Main />
    },
    {
        path: '/quiz/:testId',
        element: <CheckUserExist><Quiz /></CheckUserExist>
    },
    {
        path: '/result',
        element: <CheckUserExist><Result /></CheckUserExist>
    },
    {
        path: '/admin/login',
        element: <AdminLogin />
    },
    {
        path: '/admin',
        element: <RequireAdmin><AdminTests /></RequireAdmin>
    },
    {
        path: '/admin/tests/:testId',
        element: <RequireAdmin><TestEditor /></RequireAdmin>
    },
    {
        path: '/admin/results/:testId',
        element: <RequireAdmin><AdminResults /></RequireAdmin>
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
