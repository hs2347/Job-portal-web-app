"use server";

import connectToDB from "@/database";
import Application from "@/models/application";
import Feed from "@/models/feed";
import Job from "@/models/job";
import Profile from "@/models/profile";
import { revalidatePath } from "next/cache";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// --- Profile Actions ---

export async function createProfileAction(formData, pathToRevalidate) {
  try {
    await connectToDB();
    await Profile.create(formData);
    revalidatePath(pathToRevalidate);
    return { success: true, message: "Profile created successfully." };
  } catch (error) {
    console.error("Error creating profile:", error);
    return {
      success: false,
      message: "Failed to create profile. Please try again.",
    };
  }
}

export async function fetchProfileAction(id) {
  try {
    await connectToDB();
    const result = await Profile.findOne({ userId: id });

    // It's not an error if no profile is found, just return null
    if (!result) {
      return { success: true, data: null };
    }

    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, message: "Failed to fetch profile." };
  }
}

export async function updateProfileAction(data, pathToRevalidate) {
  try {
    await connectToDB();
    const {
      userId,
      role,
      email,
      isPremiumUser,
      memberShipType,
      memberShipStartDate,
      memberShipEndDate,
      recruiterInfo,
      candidateInfo,
      _id,
    } = data;

    await Profile.findOneAndUpdate(
      { _id: _id },
      {
        userId,
        role,
        email,
        isPremiumUser,
        memberShipType,
        memberShipStartDate,
        memberShipEndDate,
        recruiterInfo,
        candidateInfo,
      },
      { new: true }
    );

    revalidatePath(pathToRevalidate);
    return { success: true, message: "Profile updated successfully." };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      message: "Failed to update profile. Please try again.",
    };
  }
}

// --- Job Actions ---

export async function postNewJobAction(formData, pathToRevalidate) {
  try {
    await connectToDB();
    await Job.create(formData);
    revalidatePath(pathToRevalidate);
    return { success: true, message: "Job posted successfully." };
  } catch (error) {
    console.error("Error posting new job:", error);
    return { success: false, message: "Failed to post job. Please try again." };
  }
}

export async function fetchJobsForRecruiterAction(id) {
  try {
    await connectToDB();
    const result = await Job.find({ recruiterId: id });
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching recruiter jobs:", error);
    return { success: false, message: "Failed to fetch jobs." };
  }
}

export async function fetchJobsForCandidateAction(filterParams = {}) {
  try {
    await connectToDB();
    let updatedParams = {};

    // Build the query parameters
    Object.keys(filterParams).forEach((filterKey) => {
      if (filterParams[filterKey]) { // Ensure the filter value is not empty
        updatedParams[filterKey] = { $in: filterParams[filterKey].split(",") };
      }
    });

    console.log(updatedParams, "updatedParams");

    const query = Object.keys(updatedParams).length > 0 ? updatedParams : {};
    const result = await Job.find(query);

    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching candidate jobs:", error);
    return { success: false, message: "Failed to fetch jobs." };
  }
}

// --- Application Actions ---

export async function createJobApplicationAction(data, pathToRevalidate) {
  try {
    await connectToDB();
    await Application.create(data);
    revalidatePath(pathToRevalidate);
    return { success: true, message: "Application submitted successfully." };
  } catch (error) {
    console.error("Error creating job application:", error);
    return {
      success: false,
      message: "Failed to submit application. Please try again.",
    };
  }
}

export async function fetchJobApplicationsForCandidate(candidateID) {
  try {
    await connectToDB();
    const result = await Application.find({ candidateUserID: candidateID });
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching candidate applications:", error);
    return { success: false, message: "Failed to fetch applications." };
  }
}

export async function fetchJobApplicationsForRecruiter(recruiterID) {
  try {
    await connectToDB();
    const result = await Application.find({ recruiterUserID: recruiterID });
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching recruiter applications:", error);
    return { success: false, message: "Failed to fetch applications." };
  }
}

export async function updateJobApplicationAction(data, pathToRevalidate) {
  try {
    await connectToDB();
    const { _id, ...rest } = data; // Get ID and rest of the data
    await Application.findOneAndUpdate(
      { _id: _id },
      rest,
      { new: true }
    );
    revalidatePath(pathToRevalidate);
    return { success: true, message: "Application status updated." };
  } catch (error) {
    console.error("Error updating job application:", error);
    return {
      success: false,
      message: "Failed to update application. Please try again.",
    };
  }
}

// --- Other Actions ---

export async function getCandidateDetailsByIDAction(currentCandidateID) {
  try {
    await connectToDB();
    const result = await Profile.findOne({ userId: currentCandidateID });
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error getting candidate details:", error);
    return { success: false, message: "Failed to fetch candidate details." };
  }
}

export async function createFilterCategoryAction() {
  try {
    await connectToDB();
    // This function seems to just fetch all jobs, maybe for filters?
    const result = await Job.find({});
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error creating filter categories:", error);
    return { success: false, message: "Failed to fetch filter data." };
  }
}

// --- Stripe (Payment) Actions ---

export async function createPriceIdAction(data) {
  try {
    const session = await stripe.prices.create({
      currency: "inr",
      unit_amount: data?.amount * 100,
      recurring: {
        interval: "year",
      },
      product_data: {
        name: "Premium Plan",
      },
    });

    return { success: true, id: session?.id };
  } catch (error) { // <-- TYPO WAS HERE
    console.error("Error creating Stripe Price ID:", error);
    return {
      success: false,
      message: "Failed to create payment plan. Please try again.",
    };
  }
}

export async function createStripePaymentAction(data) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: data?.lineItems,
      mode: "subscription",
      billing_address_collection: "required",
      success_url: `${process.env.URL}/membership?status=success`,
      cancel_url: `${process.env.URL}/membership?status=cancel`,
    });

    return { success: true, id: session?.id };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return {
      success: false,
      message: "Failed to create payment session. Please try again.",
    };
  }
}

// --- Feed (Posts) Actions ---

export async function createFeedPostAction(data, pathToRevalidate) {
  try {
    await connectToDB();
    await Feed.create(data);
    revalidatePath(pathToRevalidate);
    return { success: true, message: "Post created successfully." };
  } catch (error) {
    console.error("Error creating feed post:", error);
    return { success: false, message: "Failed to create post." };
  }
}

export async function fetchAllFeedPostsAction() {
  try {
    await connectToDB();
    const result = await Feed.find({});
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    console.error("Error fetching feed posts:", error);
    return { success: false, message: "Failed to fetch posts." };
  }
}

export async function updateFeedPostAction(data, pathToRevalidate) {
  try {
    await connectToDB();
    const { userId, userName, message, image, likes, _id } = data;
    await Feed.findOneAndUpdate(
      { _id: _id },
      { userId, userName, image, message, likes },
      { new: true }
    );

    revalidatePath(pathToRevalidate);
    return { success: true, message: "Post updated." };
  } catch (error) {
    console.error("Error updating feed post:", error);
    return { success: false, message: "Failed to update post." };
  }
}