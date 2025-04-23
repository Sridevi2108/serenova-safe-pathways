
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const LandingPage = () => {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-4 py-12">
          <div className="max-w-md mx-auto w-full text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="bg-serenova-500 h-14 w-14 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-serenova-700 mb-4">
              Safe Steps for Every Journey
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              Empowering women with safer routes and community support for peace of mind, every step of the way.
            </p>
            
            <div className="space-y-3">
              <Link
                to="/login"
                className="btn-primary block w-full"
              >
                Login
              </Link>
              
              <Link
                to="/register"
                className="btn-secondary block w-full"
              >
                Register
              </Link>
              
              <Link
                to="/public-route-planner"
                className="btn-outline block w-full"
              >
                Use Route Planner
              </Link>
            </div>
          </div>
        </div>
        
        <footer className="py-6 bg-white">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Serenova: SafeSteps for Women
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default LandingPage;
