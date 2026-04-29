export function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: [
        'Random matching',
        'Basic audio/video',
        'Standard quality',
        'Community moderation',
      ],
      cta: 'Current Plan',
      highlight: false,
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      features: [
        'Everything in Free',
        'Gender & region filters',
        'Interest-based matching',
        'Priority support',
        'Ad-free experience',
      ],
      cta: 'Upgrade Now',
      highlight: true,
    },
    {
      name: 'VIP',
      price: '$19.99',
      period: '/month',
      features: [
        'Everything in Premium',
        'Mood-based matching',
        'AI icebreakers',
        '24/7 priority support',
        'Advanced safety tools',
      ],
      cta: 'Upgrade Now',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
        <p className="text-center text-gray-400 mb-12">
          Choose the plan that's right for you
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`glassmorphism rounded-lg p-8 transition-all ${
                plan.highlight
                  ? 'ring-2 ring-purple-500 transform scale-105'
                  : ''
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-gray-400 ml-2">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <span className="text-purple-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/50'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
