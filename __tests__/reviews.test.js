const { createReview, getReview } = require('../controllers/reviews');
const Review = require('../models/Review');
const Reservation = require('../models/Reservation');

jest.mock('../models/Review');
jest.mock('../models/Reservation');

const VALID_ID = '60d5ecb8b392d700153528a9'; 

describe('Testing EXACTLY 2 Backend Functions (Reviews)', () => {
    let req, res, next;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // This silences the console.logs so your test output stays clean!
        jest.spyOn(console, 'log').mockImplementation(() => {}); 

        req = { params: {}, body: {}, user: { id: 'user123', role: 'user' } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterEach(() => {
        // Restores console.log after the tests are done
        jest.restoreAllMocks();
    });

    // ==========================================
    // FUNCTION 1: getReview
    // ==========================================
    describe('Function 1: getReview', () => {
        it('should return a single review by ID', async () => {
            req.params.id = VALID_ID;
            
            // Mocking chained populates: .populate().populate()
            const mockPopulate2 = jest.fn().mockResolvedValue({ _id: VALID_ID, rating: 5 });
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Review.findById.mockReturnValue({ populate: mockPopulate1 });

            await getReview(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
        });

        it('should return 404 if review is not found', async () => {
            req.params.id = VALID_ID;
            
            const mockPopulate2 = jest.fn().mockResolvedValue(null);
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Review.findById.mockReturnValue({ populate: mockPopulate1 });

            await getReview(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: `No review found with the id of ${VALID_ID}` });
        });

        it('should handle server errors (catch block)', async () => {
            req.params.id = VALID_ID;
            
            const mockPopulate2 = jest.fn().mockRejectedValue(new Error('DB Error'));
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Review.findById.mockReturnValue({ populate: mockPopulate1 });

            await getReview(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Cannot get review' });
        });
    });

    // ==========================================
    // FUNCTION 2: createReview
    // ==========================================
    describe('Function 2: createReview', () => {
        it('should return 400 if reservation ID is missing', async () => {
            req.body = { rating: 5 };
            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if reservation ID is invalid format', async () => {
            req.body = { reservation: 'invalid-id', rating: 5 };
            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if rating is missing or invalid', async () => {
            req.body = { reservation: VALID_ID, rating: 6 }; // rating > 5
            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please provide a whole number rating between 1 and 5' }));
        });

        it('should return 404 if reservation is not found', async () => {
            req.body = { reservation: VALID_ID, rating: 5 };
            Reservation.findById.mockResolvedValue(null);

            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 401 if user does not own the reservation', async () => {
            req.body = { reservation: VALID_ID, rating: 5 };
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'differentUser' });

            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 400 if review already exists', async () => {
            req.body = { reservation: VALID_ID, rating: 5 };
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'user123' });
            Review.findOne.mockResolvedValue({ _id: 'existingReview' }); // Simulates existing review

            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'You have already reviewed this reservation' }));
        });

        it('should return 400 if comment is not a string', async () => {
            req.body = { reservation: VALID_ID, rating: 5, comment: 123 }; // Invalid comment type
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'user123' });
            Review.findOne.mockResolvedValue(null);

            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should successfully create a review with a valid comment', async () => {
            req.body = { reservation: VALID_ID, rating: 5, comment: ' Great massage! ' };
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'user123', massage: 'massage123' });
            Review.findOne.mockResolvedValue(null);
            Review.create.mockResolvedValue({ _id: 'newReviewId' });

            await createReview(req, res, next);
            expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({ comment: 'Great massage!' })); // Should trim spaces
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should successfully create a review and ignore empty space comments', async () => {
            req.body = { reservation: VALID_ID, rating: 5, comment: '   ' }; // Only spaces
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'user123', massage: 'massage123' });
            Review.findOne.mockResolvedValue(null);
            Review.create.mockResolvedValue({ _id: 'newReviewId' });

            await createReview(req, res, next);
            // Payload should NOT have a comment property because it was just spaces
            expect(Review.create).toHaveBeenCalledWith(expect.not.objectContaining({ comment: expect.any(String) }));
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should handle unpredicted server errors (catch block)', async () => {
            req.body = { reservation: VALID_ID, rating: 5 };
            Reservation.findById.mockRejectedValue(new Error('Random DB crash'));

            await createReview(req, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    it('should successfully create a review without a comment', async () => {
            // Testing the branch where 'comment' is completely undefined
            req.body = { reservation: VALID_ID, rating: 5 }; 
            
            Reservation.findById.mockResolvedValue({ _id: VALID_ID, user: 'user123', massage: 'massage123' });
            Review.findOne.mockResolvedValue(null);
            Review.create.mockResolvedValue({ _id: 'newReviewId' });

            await createReview(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should handle unpredicted server errors with NO error message', async () => {
            // Testing the fallback string when error.message is empty
            req.body = { reservation: VALID_ID, rating: 5 };
            
            // We throw an empty Error here, so it has no message!
            Reservation.findById.mockRejectedValue(new Error());

            await createReview(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: 'Cannot create review' // Checks that it used your fallback string
            }));
        });
    
});