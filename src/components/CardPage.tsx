import { useParams, Link } from 'react-router-dom';
import { CARDS } from './cardData';

export default function CardPage() {
  const { id } = useParams();
  const card = CARDS.find(c => c.id === Number(id));

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-red-500">Card not found</h1>
          <Link to="/" className="text-blue-500 hover:underline">
            ← Back to Canvas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="text-blue-500 hover:underline">
            ← Back to Canvas
          </Link>
        </div>
      </nav>
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">{card.title}</h1>
        
        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Overview</h2>
            <p>{card.description}</p>
          </section>
          
          {/* Add more sections based on card type */}
          {card.details && (
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Details</h2>
              <div className="whitespace-pre-line">{card.details}</div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
} 