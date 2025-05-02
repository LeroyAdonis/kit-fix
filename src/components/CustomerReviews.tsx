import { Star } from 'lucide-react';

const reviews = [
  {
    name: "Mike Johnson",
    avatar: "M",
    rating: 5,
    text: "Amazing job restoring my jersey. The number and name look brand new again. Highly recommend!"
  },
  {
    name: "Sarah Martinez",
    avatar: "S",
    rating: 5,
    text: "Great professional work and fast turnaround. My son's favorite jersey looks perfect again!"
  },
  {
    name: "David Kim",
    avatar: "D",
    rating: 5,
    text: "The restoration quality is incredible. It looks as good as new. Will definitely use the service again!"
  },
  {
    name: "David Kim",
    avatar: "D",
    rating: 5,
    text: "The restoration quality is incredible. It looks as good as new. Will definitely use the service again!"
  }
];

const CustomerReviews = () => {
  return (
    <section id="reviews" className="py-16 bg-pure-white">
      <div className="container-custom">
        <h2 className="heading-lg text-center mb-4">
          Customer Reviews
        </h2>
        <p className="text-center text-gray-600 mb-12">What our customers say about us</p>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-electric-blue text-pure-white flex items-center justify-center font-bold mr-3">
                  {review.avatar}
                </div>
                <div>
                  <h4 className="font-bold">{review.name}</h4>
                  <div className="flex">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-fiery-red text-fiery-red" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-700">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews;