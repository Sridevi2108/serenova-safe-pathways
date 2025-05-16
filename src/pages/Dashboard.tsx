
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Route, AlertTriangle, BookOpen, Star, User, Phone } from 'lucide-react';

const Dashboard = () => {
  const features = [
    {
      name: 'Route Planner',
      description: 'Find the safest path from point A to point B with our intelligent route planner.',
      icon: <Route className="h-12 w-12 text-serenova-500" />,
      path: '/route-planner'
    },
    {
      name: 'Report Incident',
      description: 'Report incidents anonymously to help other women stay safe in your community.',
      icon: <AlertTriangle className="h-12 w-12 text-serenova-500" />,
      path: '/report-incident'
    },
    {
      name: 'Survivor Blog',
      description: 'Share your stories or read others to build community support and awareness.',
      icon: <BookOpen className="h-12 w-12 text-serenova-500" />,
      path: '/survivor-blog'
    },
    {
      name: 'Rate a Route',
      description: 'Rate routes you\'ve taken to help others make informed decisions.',
      icon: <Star className="h-12 w-12 text-serenova-500" />,
      path: '/rate-route'
    },
    {
      name: 'Profile',
      description: 'Update your personal information and emergency contacts.',
      icon: <User className="h-12 w-12 text-serenova-500" />,
      path: '/profile'
    },
    {
      name: 'Helpline',
      description: 'Need help? Call our emergency helpline for immediate assistance.',
      icon: <Phone className="h-12 w-12 text-serenova-500" />,
      path: '/emergency'  // Link to the Emergency page
    }
    
  ];

  return (
    <Layout showNavbar={true}>
      <div className="serenova-container py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-serenova-700">Welcome to Serenova</h1>
          <p className="text-gray-600">Your personal safety companion. What would you like to do today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link 
              key={index} 
              to={feature.path}
              className="card hover:shadow-lg transition-all hover:border-serenova-200 hover:-translate-y-1"
            >
              <div className="text-center p-4">
                <div className="mx-auto mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-serenova-700">{feature.name}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 bg-serenova-50 rounded-lg p-6 border border-serenova-100">
          <h2 className="text-xl font-semibold mb-3 text-serenova-700">Safety Tip of the Day</h2>
          <p className="text-gray-600">
            When walking at night, stay in well-lit areas and consider sharing your location with a trusted friend or family member.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
