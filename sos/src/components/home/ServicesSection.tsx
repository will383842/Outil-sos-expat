import React from 'react';
import { Scale, Users, Shield, CheckCircle, Phone, Globe } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useIntl } from 'react-intl';

const ServicesSection: React.FC = () => {
  const { language: _language, services } = useApp();
  const intl = useIntl();

  const serviceIcons = {
    lawyer_call: Scale,
    expat_call: Users
  };

  const serviceDescriptions = {
    lawyer_call: {
      fr: 'Consultation juridique urgente par téléphone avec un avocat certifié',
      en: 'Emergency legal consultation by phone with a certified lawyer'
    },
    expat_call: {
      fr: 'Conseil pratique d\'un expatrié francophone qui connaît le pays',
      en: 'Practical advice from a French-speaking expat who knows the country'
    }
  };

  // ✅ SUPPRESSION de handleServiceSelect - utiliser liens directs
  const features = [
    {
      icon: Phone,
      title: intl.formatMessage({ id: 'services.directCall' }),
      description: intl.formatMessage({ id: 'services.directCallDesc' })
    },
    {
      icon: Shield,
      title: intl.formatMessage({ id: 'services.verifiedExperts' }),
      description: intl.formatMessage({ id: 'services.verifiedExpertsDesc' })
    },
    {
      icon: CheckCircle,
      title: intl.formatMessage({ id: 'services.satisfaction' }),
      description: intl.formatMessage({ id: 'services.satisfactionDesc' })
    },
    {
      icon: Globe,
      title: intl.formatMessage({ id: 'services.worldwide' }),
      description: intl.formatMessage({ id: 'services.worldwideDesc' })
    }
  ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {intl.formatMessage({ id: 'services.title' })}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {intl.formatMessage({ id: 'services.subtitle' })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20">
          {services.filter(service => service.isActive).map((service) => {
            const Icon = serviceIcons[service.type];
            const _description = serviceDescriptions[service.type];
            const isLawyer = service.type === 'lawyer_call';
            
            return (
              <div
                key={service.id}
                className="bg-white border-2 border-red-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <div className={`${isLawyer ? 'bg-red-100' : 'bg-blue-100'} p-5 rounded-full mb-6 group-hover:${isLawyer ? 'bg-red-200' : 'bg-blue-200'} transition-colors`}>
                    <Icon size={40} className={`${isLawyer ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {isLawyer
                      ? intl.formatMessage({ id: 'services.lawyerCall' })
                      : intl.formatMessage({ id: 'services.expatCall' })
                    }
                  </h3>
                  
                  <p className="text-gray-600 mb-6 text-center">
                    {isLawyer
                      ? intl.formatMessage({ id: 'services.lawyerCallDesc' })
                      : intl.formatMessage({ id: 'services.expatCallDesc' })
                    }
                  </p>
                  
                  <div className="flex items-center justify-between w-full mb-6">
                    <div className={`text-3xl font-bold ${isLawyer ? 'text-red-600' : 'text-blue-600'}`}>
                      €{service.price}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Clock size={20} className="mr-2" />
                      <span className="text-lg">{service.duration} min</span>
                    </div>
                  </div>
                  
                  <a
                    href={isLawyer ? '/sos-appel?type=lawyer' : '/sos-appel?type=expat'}
                    className={`w-full ${isLawyer ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors text-center block`}
                  >
                    {intl.formatMessage({ id: 'services.chooseService' })}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ Features modernisées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <feature.icon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

