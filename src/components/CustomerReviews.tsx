/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Star, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

const CustomerReviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", rating: 5, text: "" });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showArrows, setShowArrows] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "reviews"));
      setReviews(
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    };
    fetchReviews();
  }, []);

  // Check if arrows should be shown (if scrollable)
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        setShowArrows(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, [reviews, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRating = (rating: number) => {
    setForm({ ...form, rating });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.text) return;
    await addDoc(collection(db, "reviews"), {
      ...form,
      avatar: form.name[0].toUpperCase(),
      createdAt: Timestamp.now(),
    });
    setForm({ name: "", rating: 5, text: "" });
    setShowModal(false);
    // Refresh reviews
    const querySnapshot = await getDocs(collection(db, "reviews"));
    setReviews(
      querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  };

  // Scroll handlers
  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section id="reviews" className="py-16 bg-pure-white relative">
      {showArrows && (
        <>
          <a
            onClick={() => scrollBy(-350)}
            className="hidden lg:block absolute left-5 top-2/4 -translate-y-1/2 z-10 bg-transparent text-black rounded-full shadow p-2 hover:bg-gray-100 cursor-pointer"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-6 h-6" />
          </a>
          <a
            onClick={() => scrollBy(350)}
            className="hidden lg:block absolute right-5 top-2/4 -translate-y-1/2 z-10 bg-transparent text-black rounded-full shadow p-2 hover:bg-gray-100 cursor-pointer"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-6 h-6" />
          </a>
        </>
      )}
      <div className="container-custom relative">
        <h2 className="heading-lg text-center mb-4">Customer Reviews</h2>
        <p className="text-center text-gray-600 mb-12">What our customers say about us</p>

        {/* Carousel Controls */}
        <div className="relative">


          {/* Horizontally scrollable reviews with snapping */}
          <div
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto scrollbar-hide py-4 px-2"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {loading ? (
              <div className="text-center w-full">Loading...</div>
            ) : (
              reviews
                .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
                .map((review, index) => (
                  <div
                    key={review.id || index}
                    className="min-w-[320px] max-w-xs flex-shrink-0 p-6 rounded-lg border border-gray-200 shadow-sm bg-white"
                    style={{ scrollSnapAlign: "center" }}
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
                ))
            )}
          </div>
        </div>

        {/* Floating Add Review Button */}
        <div className="flex justify-center mt-4">
          <a
            onClick={() => setShowModal(true)}
            className="btn-primary bg-electric-blue hover:bg-electric-blue/90 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 shadow transition"
            aria-label="Write a review"
          >
            <Plus className="w-5 h-5" />
            Write a review
          </a>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <Button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl hover:cursor-pointer"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              &times;
            </Button>
            <h3 className="text-xl font-bold mb-4 text-center">Add a Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your Name"
                className="w-full border rounded p-2"
                required
              />
              <div className="flex items-center">
                <span className="mr-2">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => handleRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${form.rating >= star ? "fill-fiery-red text-fiery-red" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                name="text"
                value={form.text}
                onChange={handleChange}
                placeholder="Your review"
                className="w-full border rounded p-2"
                required
              />
              <button
                type="submit"
                className="bg-electric-blue text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerReviews;